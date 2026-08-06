/**
 * 应用级 HTTP E2E 测试。
 * 编译真实 AppModule，替换外部基础设施和持久化服务，验证全局 HTTP 管道及主要路由契约。
 */
import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module";
import { configureHttpApp } from "../src/app.config";
import { ChatService } from "../src/chat/chat.service";
import { RolesBootstrapService } from "../src/roles/roles.bootstrap.service";
import { RolesService } from "../src/roles/roles.service";
import { MenusService } from "../src/menus/menus.service";
import { RedisService } from "../src/infrastructure/redis/redis.service";
import { UsersService } from "../src/users/users.service";
import { WeatherService } from "../src/weather/weather.service";

const USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const CONVERSATION_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

function createTestConfig() {
  const values: Record<string, string> = {
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_USER: "test",
    DB_PASSWORD: "test",
    DB_DATABASE: "test",
    JWT_SECRET: "e2e-test-secret",
    JWT_EXPIRES_IN: "1h",
    REDIS_URL: "redis://localhost:6379/15",
    AGENT_LLM_API_KEY: "test-key",
    AGENT_LLM_MODEL: "test-model",
    AGENT_LLM_API_MODE: "chat_completions",
  };

  return {
    get: vi.fn(<T>(key: string) => values[key] as T | undefined),
    getOrThrow: vi.fn(<T>(key: string) => {
      const value = values[key];
      if (value === undefined) {
        throw new Error(`Missing test config: ${key}`);
      }
      return value as T;
    }),
  } as unknown as ConfigService;
}

function createDataSourceDouble() {
  const repository = {
    create: vi.fn((value) => value),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    findAndCount: vi.fn().mockResolvedValue([[], 0]),
    save: vi.fn().mockResolvedValue(undefined),
  };

  return {
    entityMetadatas: [],
    isInitialized: false,
    manager: { getRepository: vi.fn().mockReturnValue(repository) },
    options: { type: "postgres" },
    getRepository: vi.fn().mockReturnValue(repository),
  } as unknown as DataSource;
}

describe("application HTTP E2E", () => {
  let app: INestApplication;
  let accessToken = "";
  let usersService: {
    findByUsernameWithPassword: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    findActiveAuthContext: ReturnType<typeof vi.fn>;
  };
  let weatherService: { getDailyWeather: ReturnType<typeof vi.fn> };
  let chatService: { streamReply: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("password123", 4);
    usersService = {
      findByUsernameWithPassword: vi.fn().mockResolvedValue({
        id: USER_ID,
        username: "alice",
        email: "alice@example.com",
        password: passwordHash,
      }),
      findOne: vi
        .fn()
        .mockResolvedValue({ id: USER_ID, username: "alice", email: "alice@example.com" }),
      findActiveAuthContext: vi.fn().mockResolvedValue({
        id: USER_ID,
        username: "alice",
        email: "alice@example.com",
        roleCodes: ["user"],
      }),
    };
    weatherService = {
      getDailyWeather: vi.fn().mockResolvedValue({
        location: { name: "北京" },
        date: "2026-08-06",
        weather: { code: 0, description: "晴朗" },
      }),
    };
    chatService = {
      streamReply: vi.fn(async function* () {
        yield {
          type: "meta",
          data: { requestId: "request-1", conversationId: CONVERSATION_ID, agentCode: "weather" },
        };
        yield { type: "delta", data: { text: "北京晴朗" } };
        yield { type: "done", data: { requestId: "request-1", assistantMessageId: "message-1" } };
      }),
    };
    const redisClient = {
      exists: vi.fn().mockResolvedValue(0),
      set: vi.fn().mockResolvedValue("OK"),
    };
    const redisService = {
      isReady: true,
      getClient: vi.fn().mockReturnValue(redisClient),
      onModuleInit: vi.fn(),
      onModuleDestroy: vi.fn(),
    };
    const rolesBootstrapService = { onApplicationBootstrap: vi.fn() };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(createTestConfig())
      .overrideProvider(DataSource)
      .useValue(createDataSourceDouble())
      .overrideProvider(RedisService)
      .useValue(redisService)
      .overrideProvider(RolesBootstrapService)
      .useValue(rolesBootstrapService)
      .overrideProvider(UsersService)
      .useValue(usersService)
      .overrideProvider(RolesService)
      .useValue({})
      .overrideProvider(MenusService)
      .useValue({})
      .overrideProvider(ChatService)
      .useValue(chatService)
      .overrideProvider(WeatherService)
      .useValue(weatherService)
      .compile();

    app = moduleRef.createNestApplication();
    configureHttpApp(app, { apiPrefix: "api" });
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  it("公开根路由返回统一成功结构", async () => {
    const response = await request(app.getHttpServer())
      .get("/api")
      .expect(200)
      .expect({ code: 200, data: "Unified NestJS", msg: "操作成功" });

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("受保护的 Agent 路由拒绝未携带令牌的请求", async () => {
    const response = await request(app.getHttpServer()).get("/api/agents").expect(401);

    expect(response.body).toEqual({ code: 401, data: null, msg: "未授权，请先登录" });
  });

  it("公开登录接口签发令牌，令牌可访问 Agent 目录", async () => {
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ username: "alice", password: "password123" })
      .expect(200);

    accessToken = loginResponse.body.data.accessToken;
    expect(accessToken).toEqual(expect.any(String));

    const agentsResponse = await request(app.getHttpServer())
      .get("/api/agents")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(agentsResponse.body).toEqual({
      code: 200,
      data: [{ code: "weather", name: "天气助手", description: "查询当前、今天和明天的天气" }],
      msg: "操作成功",
    });
  });

  it("公开天气路由执行 DTO 转换并返回统一结构", async () => {
    await request(app.getHttpServer())
      .get("/api/weather/today")
      .query({ city: " 北京 ", countryCode: " cn " })
      .expect(200);

    expect(weatherService.getDailyWeather).toHaveBeenCalledWith(
      { city: "北京", countryCode: "CN" },
      "today",
    );
  });

  it("普通用户不能访问用户管理，非管理接口仍执行全局 UUID 校验", async () => {
    await request(app.getHttpServer())
      .get("/api/users")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get("/api/roles")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(403);

    const validationResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ username: "a", password: "short", unexpected: true })
      .expect(400);
    expect(validationResponse.body).toMatchObject({ code: 400, data: null });
    expect(validationResponse.body.msg).toContain("不允许传入");

    const uuidResponse = await request(app.getHttpServer())
      .get("/api/chat/conversations/not-a-uuid")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(400);
    expect(uuidResponse.body).toEqual({ code: 400, data: null, msg: "参数必须是有效的 UUID v4" });
  });

  it("全局异常过滤器隐藏未捕获异常细节", async () => {
    weatherService.getDailyWeather.mockRejectedValueOnce(new Error("database password"));

    const response = await request(app.getHttpServer())
      .get("/api/weather/today")
      .query({ city: "北京", countryCode: "CN" })
      .expect(500);

    expect(response.body).toEqual({ code: 500, data: null, msg: "服务器内部错误" });
  });

  it("SSE 路由透传 meta、delta、done 事件而不包装响应", async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/chat/conversations/${CONVERSATION_ID}/messages/stream`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ message: "北京天气" })
      .expect(200);

    expect(response.headers["content-type"]).toMatch(/text\/event-stream/);
    expect(response.text).toContain("event: meta");
    expect(response.text).toContain("event: delta");
    expect(response.text).toContain("event: done");
    expect(response.text).toContain('data: {"requestId":"request-1"');
    expect(chatService.streamReply).toHaveBeenCalledWith(
      CONVERSATION_ID,
      USER_ID,
      { message: "北京天气" },
      expect.any(AbortSignal),
    );
  });
});

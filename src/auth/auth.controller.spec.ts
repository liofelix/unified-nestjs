import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { IS_PUBLIC_KEY } from "./decorators/public.decorator";

describe("AuthController", () => {
  let controller: AuthController;
  let service: jest.Mocked<Pick<AuthService, "login" | "logout">>;

  beforeEach(async () => {
    service = {
      login: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("is marked as public", () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, AuthController)).toBe(true);
  });

  it("logs in through the auth service", async () => {
    const dto = {
      username: "alice",
      password: "plain-password",
    };
    const response = {
      accessToken: "access-token",
    };
    service.login.mockResolvedValue(response);

    await expect(controller.login(dto)).resolves.toBe(response);
    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it("logs out through the auth service", () => {
    const response = null;
    service.logout.mockReturnValue(response);

    expect(controller.logout()).toBe(response);
    expect(service.logout).toHaveBeenCalled();
  });
});

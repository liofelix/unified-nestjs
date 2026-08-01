/**
 * 应用根模块。
 * 集中组装配置、数据库、认证、用户、天气、Agent、聊天以及全局 HTTP 能力。
 */
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule, type TypeOrmModuleOptions } from "@nestjs/typeorm";
import { AgentsModule } from "./agents/agents.module";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { ChatModule } from "./chat/chat.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { RolesModule } from "./roles/roles.module";
import { UsersModule } from "./users/users.module";
import { WeatherModule } from "./weather/weather.module";

/** NestJS 应用根模块，注册全局拦截器、异常过滤器和 JWT 守卫。 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === "production" ? ".env.production" : ".env.development",
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: "postgres",
        host: configService.getOrThrow<string>("DB_HOST"),
        port: Number(configService.getOrThrow<string>("DB_PORT")),
        username: configService.getOrThrow<string>("DB_USER"),
        password: configService.getOrThrow<string>("DB_PASSWORD"),
        database: configService.getOrThrow<string>("DB_DATABASE"),
        autoLoadEntities: true,
        retryAttempts: 1,
        synchronize: process.env.NODE_ENV !== "production",
        migrationsRun: false,
      }),
    }),
    RolesModule,
    AuthModule,
    UsersModule,
    WeatherModule,
    AgentsModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

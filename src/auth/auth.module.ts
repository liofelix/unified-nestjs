import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, type JwtSignOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RedisModule } from "../infrastructure/redis/redis.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthRevocationService } from "./auth.revocation.service";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    UsersModule,
    PassportModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<JwtSignOptions["expiresIn"]>("JWT_EXPIRES_IN") ?? "1h",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRevocationService, JwtStrategy],
})
export class AuthModule {}

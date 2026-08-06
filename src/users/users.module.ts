/**
 * 用户模块。
 * 注册用户实体的 TypeORM Repository，并导出 UsersService 给认证模块使用。
 */
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminGuard } from "../auth/guards/admin.guard";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { User } from "./entities/user.entity";
import { RolesModule } from "../roles/roles.module";

/** 用户领域的 NestJS 模块。 */
@Module({
  imports: [TypeOrmModule.forFeature([User]), RolesModule],
  controllers: [UsersController],
  providers: [UsersService, AdminGuard],
  exports: [UsersService],
})
export class UsersModule {}

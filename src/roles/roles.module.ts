/**
 * 角色模块。
 * 注册角色实体、角色 CRUD、系统角色初始化，并向用户模块导出 RolesService。
 */
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Role } from "./entities/role.entity";
import { RolesBootstrapService } from "./roles.bootstrap.service";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";

/** 角色领域的 NestJS 模块。 */
@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  controllers: [RolesController],
  providers: [RolesService, RolesBootstrapService],
  exports: [RolesService],
})
export class RolesModule {}

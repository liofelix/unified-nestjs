/**
 * 菜单模块。
 * 注册菜单实体、角色菜单关系、菜单 CRUD 和当前用户权限查询。
 */
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Role } from "../roles/entities/role.entity";
import { User } from "../users/entities/user.entity";
import { Menu } from "./entities/menu.entity";
import { MenusController } from "./menus.controller";
import { MenusService } from "./menus.service";

/** 菜单领域的 NestJS 模块。 */
@Module({
  imports: [TypeOrmModule.forFeature([Menu, Role, User])],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}

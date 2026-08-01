/**
 * 系统角色启动初始化服务。
 * 应用启动时幂等补齐 admin 与 user，并修复其系统标记或软删除状态。
 */
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Role } from "./entities/role.entity";
import { SYSTEM_ROLE_DEFINITIONS } from "./roles.constants";

/** 确保系统预置角色持续可用。 */
@Injectable()
export class RolesBootstrapService implements OnApplicationBootstrap {
  /** 注入角色 Repository。 */
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  /** 逐个创建缺失的系统角色，并恢复被数据库直接软删除的系统角色。 */
  async onApplicationBootstrap(): Promise<void> {
    for (const definition of SYSTEM_ROLE_DEFINITIONS) {
      const role = await this.rolesRepository.findOne({ where: { code: definition.code } });

      if (!role) {
        await this.rolesRepository.save(
          this.rolesRepository.create({ ...definition, isSystem: true }),
        );
        continue;
      }

      if (!role.isSystem || role.isDeleted) {
        role.isSystem = true;
        role.isDeleted = false;
        role.deletedAt = null;
        role.deletedBy = null;
        await this.rolesRepository.save(role);
      }
    }
  }
}

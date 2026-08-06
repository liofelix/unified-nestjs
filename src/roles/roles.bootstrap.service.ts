/**
 * 系统角色启动初始化服务。
 * 应用启动时幂等补齐 admin 与 user，并修复其系统标记或软删除状态。
 */
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { BinaryStatus } from "../common/types/binary-status";
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

  /** 批量查询并保存缺失或状态异常的系统角色，避免启动时逐条往返数据库。 */
  async onApplicationBootstrap(): Promise<void> {
    const definitions = SYSTEM_ROLE_DEFINITIONS;
    const roles = await this.rolesRepository.find({
      where: { code: In(definitions.map(({ code }) => code)) },
    });
    const rolesByCode = new Map(roles.map((role) => [role.code, role]));
    const rolesToSave: Role[] = [];

    for (const definition of definitions) {
      const role = rolesByCode.get(definition.code);

      if (!role) {
        rolesToSave.push(
          this.rolesRepository.create({ ...definition, isSystem: BinaryStatus.YES }),
        );
        continue;
      }

      if (role.isSystem !== BinaryStatus.YES || role.isDeleted === BinaryStatus.YES) {
        role.isSystem = BinaryStatus.YES;
        role.isDeleted = BinaryStatus.NO;
        role.deletedAt = null;
        role.deletedBy = null;
        rolesToSave.push(role);
      }
    }

    if (rolesToSave.length > 0) {
      await this.rolesRepository.save(rolesToSave);
    }
  }
}

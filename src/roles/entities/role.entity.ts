/**
 * 角色持久化实体。
 * 对应 roles 表，包含角色标识、系统角色标记、审计字段和软删除标记。
 */
import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { BINARY_STATUSES, BinaryStatus } from "../../common/types/binary-status";
import { Menu } from "../../menus/entities/menu.entity";
import { User } from "../../users/entities/user.entity";

/** 支持按未删除状态和创建时间分页查询角色。 */
@Index("IDX_roles_active_created", ["isDeleted", "createdAt"])
/** roles 表的 TypeORM 映射。 */
@Entity("roles")
@Check("CHK_roles_is_system", `"is_system" IN (${BINARY_STATUSES.join(", ")})`)
@Check("CHK_roles_is_deleted", `"is_deleted" IN (${BINARY_STATUSES.join(", ")})`)
export class Role {
  /** 角色 UUID 主键。 */
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** 稳定且唯一的机器可读角色编码。 */
  @Column({ type: "varchar", length: 50, unique: true })
  code!: string;

  /** 面向用户展示的角色名称。 */
  @Column({ type: "varchar", length: 50 })
  name!: string;

  /** 可选角色说明。 */
  @Column({ type: "varchar", length: 255, nullable: true })
  description: string | null = null;

  /** 系统预置角色标记，0 表示普通角色，1 表示系统角色。 */
  @Column({ name: "is_system", type: "smallint", default: BinaryStatus.NO })
  isSystem = BinaryStatus.NO;

  /** 记录创建时间。 */
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  /** 创建者用户 UUID；系统创建时可为空。 */
  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy: string | null = null;

  /** 最近更新时间。 */
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  /** 最近更新者用户 UUID。 */
  @Column({ name: "updated_by", type: "uuid", nullable: true })
  updatedBy: string | null = null;

  /** 软删除发生时间；未删除时为空。 */
  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null = null;

  /** 执行软删除的用户 UUID。 */
  @Column({ name: "deleted_by", type: "uuid", nullable: true })
  deletedBy: string | null = null;

  /** 软删除状态，0 表示未删除，1 表示已删除。 */
  @Column({ name: "is_deleted", type: "smallint", default: BinaryStatus.NO })
  isDeleted = BinaryStatus.NO;

  /** 拥有该角色的用户集合，仅用于关系查询，不向角色接口反向输出。 */
  @ManyToMany(() => User, (user) => user.roles)
  users!: User[];

  /** 角色拥有的菜单、页面和按钮权限集合；关联表使用 role_menus。 */
  @ManyToMany(() => Menu, (menu) => menu.roles)
  @JoinTable({
    name: "role_menus",
    joinColumn: { name: "role_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "menu_id", referencedColumnName: "id" },
  })
  menus!: Menu[];
}

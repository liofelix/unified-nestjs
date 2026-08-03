/**
 * 菜单持久化实体。
 * 对应 menus 表，支持目录、页面和按钮权限节点，并保留审计与软删除字段。
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Role } from "../../roles/entities/role.entity";
import type { MenuType } from "../menus.constants";

/** 支持按有效状态、父节点和排序字段查询菜单树。 */
@Index("IDX_menus_active_parent_sort", ["isDeleted", "parentId", "sort"])
/** 按钮权限编码在菜单中保持唯一。 */
@Index("UQ_menus_permission", ["permission"], {
  unique: true,
  where: '"permission" IS NOT NULL',
})
/** menus 表的 TypeORM 映射。 */
@Entity("menus")
export class Menu {
  /** 菜单 UUID 主键。 */
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** 稳定且唯一的机器可读菜单编码。 */
  @Column({ type: "varchar", length: 100, unique: true })
  code!: string;

  /** 面向用户展示的菜单名称。 */
  @Column({ type: "varchar", length: 100 })
  name!: string;

  /** 菜单节点类型：目录、页面或按钮。 */
  @Column({ type: "varchar", length: 20 })
  type!: MenuType;

  /** 父级菜单 UUID；根节点为空。 */
  @Column({ name: "parent_id", type: "uuid", nullable: true })
  parentId: string | null = null;

  /** 父级菜单关系。 */
  @ManyToOne(() => Menu, (menu) => menu.children, {
    nullable: true,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "parent_id", referencedColumnName: "id" })
  parent: Menu | null = null;

  /** 子菜单关系，仅用于构建菜单树。 */
  @OneToMany(() => Menu, (menu) => menu.parent)
  children!: Menu[];

  /** 页面或目录对应的前端路由路径。 */
  @Column({ type: "varchar", length: 255, nullable: true })
  path: string | null = null;

  /** 页面对应的前端组件标识。 */
  @Column({ type: "varchar", length: 255, nullable: true })
  component: string | null = null;

  /** 前端菜单图标标识。 */
  @Column({ type: "varchar", length: 100, nullable: true })
  icon: string | null = null;

  /** 按钮节点对应的权限编码。 */
  @Column({ type: "varchar", length: 100, nullable: true })
  permission: string | null = null;

  /** 同级菜单排序值，数值越小越靠前。 */
  @Column({ type: "integer", default: 0 })
  sort = 0;

  /** 菜单是否在前端导航中可见。 */
  @Column({ name: "is_visible", type: "boolean", default: true })
  isVisible = true;

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

  /** 软删除状态，查询服务默认只返回 false 的记录。 */
  @Column({ name: "is_deleted", type: "boolean", default: false })
  isDeleted = false;

  /** 与该菜单关联的角色集合。 */
  @ManyToMany(() => Role, (role) => role.menus)
  roles!: Role[];
}

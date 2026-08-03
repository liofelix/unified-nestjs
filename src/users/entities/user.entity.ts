/**
 * 用户持久化实体。
 * 对应 users 表，包含唯一身份字段、审计字段和软删除标记；密码默认不参与普通查询。
 */
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { BINARY_STATUSES, BinaryStatus } from "../../common/types/binary-status";
import { Role } from "../../roles/entities/role.entity";

/** users 表的 TypeORM 映射。 */
@Entity("users")
@Check("CHK_users_is_deleted", `"is_deleted" IN (${BINARY_STATUSES.join(", ")})`)
export class User {
  /** 用户 UUID 主键。 */
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** 唯一登录用户名。 */
  @Column({ type: "varchar", length: 50, unique: true })
  username!: string;

  /** bcrypt 哈希密码；select=false 避免普通查询返回。 */
  @Column({ type: "varchar", length: 255, select: false })
  password!: string;

  /** 唯一邮箱地址。 */
  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

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

  /** 用户拥有的角色集合；关联表使用 user_roles。 */
  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: "user_roles",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "role_id", referencedColumnName: "id" },
  })
  roles!: Role[];
}

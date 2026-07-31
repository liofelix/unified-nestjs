/**
 * 用户持久化实体。
 * 对应 users 表，包含唯一身份字段、审计字段和软删除标记；密码默认不参与普通查询。
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/** users 表的 TypeORM 映射。 */
@Entity("users")
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

  /** 软删除状态，查询服务默认只返回 false 的记录。 */
  @Column({ name: "is_deleted", type: "boolean", default: false })
  isDeleted = false;
}

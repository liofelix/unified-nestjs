import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  username!: string;

  @Column({ type: "varchar", length: 255, select: false })
  password!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy: string | null = null;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @Column({ name: "updated_by", type: "uuid", nullable: true })
  updatedBy: string | null = null;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null = null;

  @Column({ name: "deleted_by", type: "uuid", nullable: true })
  deletedBy: string | null = null;

  @Column({ name: "is_deleted", type: "boolean", default: false })
  isDeleted = false;
}

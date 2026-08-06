/**
 * PostgreSQL 数据库异常判定工具。
 * 只把明确的唯一约束错误转换为业务冲突，避免把连接、外键或检查约束故障
 * 误报成重复数据。
 */
import { QueryFailedError } from "typeorm";

/** PostgreSQL 驱动错误中本次映射需要读取的字段。 */
interface PostgresDriverError {
  /** PostgreSQL SQLSTATE 错误码。 */
  code?: string;
  /** 触发错误的约束名称。 */
  constraint?: string;
  /** PostgreSQL 对冲突字段和值的描述。 */
  detail?: string;
}

/** 从 TypeORM 查询失败异常中取出 PostgreSQL 驱动错误。 */
export function getPostgresDriverError(error: QueryFailedError): PostgresDriverError {
  return (error.driverError ?? {}) as PostgresDriverError;
}

/** 判断异常是否为 PostgreSQL 唯一约束冲突。 */
export function isPostgresUniqueViolation(error: unknown): error is QueryFailedError {
  return error instanceof QueryFailedError && getPostgresDriverError(error).code === "23505";
}

/** 返回约束名和字段详情的统一小写文本，供领域服务做精确字段映射。 */
export function getPostgresConflictText(error: QueryFailedError): string {
  const driverError = getPostgresDriverError(error);
  return `${driverError.constraint ?? ""} ${driverError.detail ?? ""}`.toLowerCase();
}

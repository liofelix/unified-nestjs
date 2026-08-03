/**
 * 持久化二值状态枚举。
 * 数据库和对外接口统一使用 0 表示否/未激活，1 表示是/激活。
 */
export enum BinaryStatus {
  /** 否、隐藏、未删除或非系统状态。 */
  NO = 0,
  /** 是、显示、已删除或系统状态。 */
  YES = 1,
}

/** 二值状态允许的数字集合。 */
export const BINARY_STATUSES = [BinaryStatus.NO, BinaryStatus.YES] as const;

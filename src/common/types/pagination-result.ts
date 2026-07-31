/**
 * 公共分页结果类型。
 * 统一所有列表查询接口的分页返回结构。
 */

/** 分页查询的统一返回结构。 */
export interface PaginationResult<T> {
  /** 当前页数据。 */
  items: T[];
  /** 符合筛选条件的总记录数。 */
  total: number;
  /** 当前页码。 */
  pageNo: number;
  /** 当前页大小。 */
  pageSize: number;
}

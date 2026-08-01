/** 系统预置角色的稳定编码。 */
export const SYSTEM_ROLE_CODES = {
  admin: "admin",
  user: "user",
} as const;

/** 应用启动与新用户创建时使用的系统角色定义。 */
export const SYSTEM_ROLE_DEFINITIONS = [
  {
    code: SYSTEM_ROLE_CODES.admin,
    name: "管理员",
    description: "系统管理员角色",
  },
  {
    code: SYSTEM_ROLE_CODES.user,
    name: "普通用户",
    description: "默认用户角色",
  },
] as const;

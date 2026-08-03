/**
 * 菜单领域常量。
 * 统一目录、页面和按钮三类菜单节点的机器可读取值。
 */

/** 菜单节点类型的稳定编码。 */
export const MENU_TYPES = ["directory", "page", "button"] as const;

/** 菜单节点类型。 */
export type MenuType = (typeof MENU_TYPES)[number];

/** 目录菜单类型编码。 */
export const MENU_TYPE_DIRECTORY = "directory" as const;

/** 页面菜单类型编码。 */
export const MENU_TYPE_PAGE = "page" as const;

/** 按钮权限类型编码。 */
export const MENU_TYPE_BUTTON = "button" as const;

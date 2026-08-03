/**
 * 菜单领域常量。
 * 统一目录、页面和按钮三类菜单节点的机器可读取值。
 */

/** 菜单节点类型的稳定数字编码。 */
export enum MenuType {
  /** 目录节点。 */
  DIRECTORY = 1,
  /** 页面节点。 */
  PAGE = 2,
  /** 按钮权限节点。 */
  BUTTON = 3,
}

/** 菜单节点类型允许的数字集合。 */
export const MENU_TYPES = [MenuType.DIRECTORY, MenuType.PAGE, MenuType.BUTTON] as const;

/** 目录菜单类型编码。 */
export const MENU_TYPE_DIRECTORY = MenuType.DIRECTORY;

/** 页面菜单类型编码。 */
export const MENU_TYPE_PAGE = MenuType.PAGE;

/** 按钮权限类型编码。 */
export const MENU_TYPE_BUTTON = MenuType.BUTTON;

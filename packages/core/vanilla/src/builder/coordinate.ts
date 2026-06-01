import type { Child, CoordinateConfig } from './types';

/**
 * 构造一个 coordinate IR 子节点（具名点占位，不绘制）
 * @description `id` 必要（coordinate 存在意义就是被引用），提为首 positional；`position` 在 config 必填
 *   （类型层 `CoordinateConfig` 派生自 `IRCoordinate` 故 position 非可选），缺失在编译期由 schema 报错。
 */
export const coordinate = (id: string, config: CoordinateConfig): Child => ({
  type: 'coordinate',
  id,
  ...config,
});

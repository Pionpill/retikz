import type { IRCoordinate } from '@retikz/core';

/** 作者侧命名坐标输入 */
export type InputCoordinate = IRCoordinate & {
  /** 可选编译驱动解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};

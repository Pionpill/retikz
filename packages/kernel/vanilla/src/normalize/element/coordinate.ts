import type { IRCoordinate } from '@retikz/core';

/** 作者侧命名坐标输入 */
export type InputCoordinate = IRCoordinate & {
  /** 归一化时保留的作者元数据，不进入 Core IR */
  authoring?: unknown;
};

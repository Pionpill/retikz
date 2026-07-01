import type { z } from 'zod';

import type { WebAnchorValue } from '../../geometry/anchor';
import type { Position } from '../../geometry/point';
import type { Rect } from '../../geometry/rect';
import type { IRJsonObject } from '../../schemas/json';

/**
 * 连接面命名 anchor 的名字。
 *
 * 编译器会优先传入归一化后的 Web/CSS anchor 名，例如 `top` / `right` / `bottom` /
 * `left` / `top-left` / `top-right` / `bottom-left` / `bottom-right`。
 * 第三方 boundary 也可以约定额外名字；不支持时返回 `undefined` 即可。
 */
export type BoundaryAnchorName = WebAnchorValue | (string & {});

/** boundary definition 的作者侧输入形态。 */
export type BoundaryDefinitionInput<TParams extends IRJsonObject> = {
  /** 注册表 key，由 IR `boundary` 引用。 */
  name: string;
  /** 运行时连接面参数的 schema。 */
  paramsSchema: z.ZodType<TParams>;
  /** 从中心指向 toward 的射线与连接面的交点。 */
  boundaryPoint: (rect: Rect, toward: Position, params: TParams) => Position;
  /**
   * 可选的命名 anchor 支持，用于 Web 风格连接点或自定义连接点。
   * @default 不支持；调用方回退或报告不支持该 anchor
   */
  anchor?: (rect: Rect, name: BoundaryAnchorName, params: TParams) => Position | undefined;
};

/** Boundary 定义的擦除形态：registry 存这个。 */
export type BoundaryDefinition = BoundaryDefinitionInput<IRJsonObject>;

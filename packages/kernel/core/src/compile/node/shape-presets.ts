import type { IRJsonObject, IRNode, IRShapeRef } from '../../schemas';

import { BuiltinShape } from '../../schemas';

/** Node shape preset 解析后的 provider 查询形态。 */
export type ResolvedNodeShapePreset = {
  /** 实际查询的 shape provider 名称。 */
  type: string;
  /** 传给 provider 的 JSON-safe 参数对象。 */
  params: IRJsonObject;
};

/**
 * 将 Node shape preset 解析到实际 provider 名称和参数。
 * @description `circle` 与 `diamond` 是 core IR 保留的一等内置 shape 名；compile 期解析为 `ellipse` / `polygon`
 *   provider 实现它们的几何，不把它们视为 parser sugar，也不改写原始 IR。
 */
export const resolveNodeShapePreset = (shape: IRNode['shape']): ResolvedNodeShapePreset => {
  if (shape === undefined) return { type: BuiltinShape.Rectangle, params: {} };
  if (shape === BuiltinShape.Circle) return { type: BuiltinShape.Ellipse, params: { circumscribe: 'equal' } };
  if (shape === BuiltinShape.Diamond) return { type: 'polygon', params: { sides: 4, rotate: 0 } };
  if (typeof shape === 'string') return { type: shape, params: {} };
  const ref: IRShapeRef = shape;
  return { type: ref.type, params: ref.params ?? {} };
};

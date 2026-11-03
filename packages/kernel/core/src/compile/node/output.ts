import type { ScenePrimitive } from '../../contract';
import type { CanonicalDropShadow, IRPosition } from '../../schemas';
import { Anchor } from '../../shared';
import { rect } from '../../shared/geometry';
import type { RegisterPaint } from '../resource';
import { outerRectOf } from './anchors';
import { emitNodePrimitives } from './emit';
import { labelExtentPoints } from './label';
import type { CompiledNode } from './types';

/** 节点输出所需的圆整与资源登记能力 */
export type NodeEmitContext = Readonly<{
  /** 输出数值圆整 */
  round: (value: number) => number;
  /** 将绘制值登记到调用方工作区 */
  registerPaint: RegisterPaint;
}>;

/** 从已完成的节点布局生成图元及边界，资源通过显式能力登记 */
export const emitNodeOutput = (
  compilation: CompiledNode,
  context: NodeEmitContext,
): {
  primitives: Array<ScenePrimitive>;
  bounds: Array<{ boundsPoints: Array<IRPosition>; shadow?: CanonicalDropShadow }>;
} => {
  const { layout, properties } = compilation;
  const primitives = emitNodePrimitives(compilation, context.round, context.registerPaint);
  const outer = outerRectOf(layout);
  return {
    primitives,
    bounds: [
      {
        boundsPoints: [Anchor.TopLeft, Anchor.TopRight, Anchor.BottomLeft, Anchor.BottomRight].map(anchor =>
          rect.anchor(outer, anchor),
        ),
        shadow: properties.shadow,
      },
      { boundsPoints: labelExtentPoints(layout) },
    ],
  };
};

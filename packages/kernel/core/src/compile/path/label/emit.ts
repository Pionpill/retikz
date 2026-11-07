import type { CurveSegmentSample } from '@retikz/math';

import type { ScenePrimitive, PathDefinitionLabel } from '../../../contract';
import { combineOpacity } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import { emitTextBlock } from '../../text';
import type { CompiledTextBlockLayout } from '../../text';
import { layoutPathLabel } from './layout';
import type { CompiledPathLabelLayout, PathLabelContext } from './types';

/** 将路径标签布局转为图元，供路径与边界标签共同消费 */
export const emitLabelPrimitive = (
  canon: PathDefinitionLabel,
  sample: CurveSegmentSample,
  context: PathLabelContext,
): { primitive: ScenePrimitive; boundsPoints: Array<IRPosition> } => {
  const layout = layoutPathLabel(canon, sample, context);
  return {
    primitive: placePathLabelContent(
      emitPathLabelContent(canon, layout.block, context.hostOpacity),
      layout,
      context.round,
    ),
    boundsPoints: layout.boundsPoints,
  };
};

/** 尚未放置与舍入的标签局部内容 */
export type PathLabelContent = ReturnType<typeof emitTextBlock>;

/** 在原点产生可复用的文本和公式内容，保留未舍入坐标 */
export const emitPathLabelContent = (
  canon: PathDefinitionLabel,
  block: CompiledTextBlockLayout,
  hostOpacity: PathLabelContext['hostOpacity'],
): PathLabelContent =>
  emitTextBlock(
    block,
    {
      lines: canon.text.lines,
      color: canon.text.color,
      opacity: combineOpacity(canon.opacity, hostOpacity),
      textAlign: canon.text.textAlign,
    },
    0,
    0,
    value => value,
  );

/** 将局部内容移到当前标签位置，保持顶层文本和公式图元的既有结构 */
export const placePathLabelContent = (
  content: PathLabelContent,
  placement: Omit<CompiledPathLabelLayout, 'block'>,
  round: PathLabelContext['round'],
): ScenePrimitive => {
  const { left, top, transforms } = placement;
  const children = content.map(primitive => {
    if (primitive.type === 'text')
      return {
        ...primitive,
        x: round(left + primitive.x),
        y: round(top + primitive.y),
        lineHeight: round(primitive.lineHeight),
        measuredWidth: round(primitive.measuredWidth),
        measuredHeight: round(primitive.measuredHeight),
      };
    return {
      ...primitive,
      transforms: primitive.transforms?.map(transform =>
        transform.kind === 'translate'
          ? { ...transform, x: round(left + transform.x), y: round(top + transform.y) }
          : transform,
      ),
    };
  });
  return transforms === undefined
    ? children.length === 1
      ? children[0]
      : { type: 'group', children }
    : { type: 'group', transforms, children };
};

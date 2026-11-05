import type { CurveSegmentSample } from '@retikz/math';
import { RAD_TO_DEG } from '@retikz/math';

import type { TextMeasurer, GroupPrimitive, ScenePrimitive, PathDefinitionLabel } from '../../../contract';
import { combineOpacity } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import type { TextLayoutContext } from '../../text';
import { emitTextBlock, layoutTextBlock } from '../../text';

/** 边标注公式上下文 */
type LabelTexContext = Pick<TextLayoutContext, 'lowerTex' | 'warn'>;

/** step label 放置时额外需要的宿主几何信息 */
type LabelPlacementContext = {
  /** 宿主计算的侧向距离，省略时使用标签自身的 distance */
  sideOffset?: number;
};

/** step label emit 所需上下文 */
export type EmitLabelPrimitiveContext = {
  /** 按实际字体测量标签文字 */
  measureText: TextMeasurer;
  /** 统一输出坐标与尺寸的数值精度 */
  round: (n: number) => number;
  /** 与标签自身透明度合成的宿主透明度 */
  hostOpacity?: number;
  /** 已解析公式的降解和诊断能力 */
  tex?: LabelTexContext;
  /** 宿主提供的标签几何定位结果 */
  placement?: LabelPlacementContext;
};

/**
 * 将共享文本块放置到路径采样点
 * @description 返回文字或组合图元及旋转后的文本块包络
 */
export const emitLabelPrimitive = (
  canon: PathDefinitionLabel,
  sample: CurveSegmentSample,
  context: EmitLabelPrimitiveContext,
): { primitive: ScenePrimitive; boundsPoints: Array<IRPosition> } => {
  const { measureText, round, hostOpacity, tex: texCtx, placement: placementCtx } = context;

  const side = canon.side;
  const sloped = canon.sloped === true;
  const sideDistance = canon.distance;
  const sideOffset = placementCtx?.sideOffset ?? sideDistance;
  const labelOpacity = combineOpacity(canon.opacity, hostOpacity);

  const block = layoutTextBlock(canon.text.lines, canon.text, {
    measureText,
    lowerTex: texCtx?.lowerTex,
    font: canon.text.font,
    warn: texCtx?.warn ?? (() => {}),
  });
  const blockWidth = block.width;
  const blockHeight = block.height;
  const ax = sample.point[0];
  const ay = sample.point[1];
  let left: number;
  let top: number;
  if (side === 'bottom') {
    left = ax - blockWidth / 2;
    top = ay + sideOffset;
  } else if (side === 'left') {
    left = ax - sideOffset - blockWidth;
    top = ay - blockHeight / 2;
  } else if (side === 'right') {
    left = ax + sideOffset;
    top = ay - blockHeight / 2;
  } else if (side === 'center') {
    left = ax - blockWidth / 2;
    top = ay - blockHeight / 2;
  } else {
    left = ax - blockWidth / 2;
    top = ay - sideOffset - blockHeight;
  }

  const children = emitTextBlock(
    block,
    {
      lines: canon.text.lines,
      color: canon.text.color,
      opacity: labelOpacity,
      textAlign: canon.text.textAlign,
    },
    left,
    top,
    round,
  );
  const group: GroupPrimitive = { type: 'group', children };
  const right = left + blockWidth;
  const bottom = top + blockHeight;

  if (sloped) {
    const angleDeg = Math.atan2(sample.tangent[1], sample.tangent[0]) * RAD_TO_DEG;
    const rotated: GroupPrimitive = {
      type: 'group',
      transforms: [{ kind: 'rotate', degrees: round(angleDeg), cx: round(ax), cy: round(ay) }],
      children,
    };
    const angleRad = angleDeg / RAD_TO_DEG;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const boundsPoints = [
      [left, top],
      [right, top],
      [left, bottom],
      [right, bottom],
    ].map(([x, y]): IRPosition => [ax + (x - ax) * cos - (y - ay) * sin, ay + (x - ax) * sin + (y - ay) * cos]);

    return {
      primitive: rotated,
      boundsPoints,
    };
  }

  return {
    primitive: children.length === 1 ? children[0] : group,
    boundsPoints: [
      [left, top],
      [right, top],
      [left, bottom],
      [right, bottom],
    ],
  };
};

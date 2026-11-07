import type { CurveSegmentSample } from '@retikz/math';
import { RAD_TO_DEG } from '@retikz/math';

import type { PathDefinitionLabel } from '../../../contract';
import type { IRPosition } from '../../../schemas';
import { layoutTextBlock } from '../../text';
import type { CompiledTextBlockLayout } from '../../text';
import type { CompiledPathLabelLayout, PathLabelContext } from './types';

/** 测量文字与公式，不依赖路径几何或宿主位置 */
export const measurePathLabel = (
  canon: PathDefinitionLabel,
  context: Pick<PathLabelContext, 'measureText' | 'tex'>,
): CompiledTextBlockLayout => {
  const { measureText, tex: texCtx } = context;
  return layoutTextBlock(canon.text.lines, canon.text, {
    measureText,
    lowerTex: texCtx?.lowerTex,
    font: canon.text.font,
    warn: texCtx?.warn ?? (() => {}),
  });
};

/** 排版文字并按路径采样点定位，保留精确边界与绘制变换 */
export const placePathLabel = (
  canon: PathDefinitionLabel,
  sample: CurveSegmentSample,
  block: Pick<CompiledTextBlockLayout, 'width' | 'height'>,
  context: Pick<PathLabelContext, 'round' | 'placement'>,
): Omit<CompiledPathLabelLayout, 'block'> => {
  const { round, placement: placementCtx } = context;
  const side = canon.side;
  const sloped = canon.sloped === true;
  const sideDistance = canon.distance;
  const sideOffset = placementCtx?.sideOffset ?? sideDistance;

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

  const right = left + blockWidth;
  const bottom = top + blockHeight;
  const corners: Array<IRPosition> = [
    [left, top],
    [right, top],
    [left, bottom],
    [right, bottom],
  ];
  if (!sloped) return { left, top, boundsPoints: corners };
  const angleDeg = Math.atan2(sample.tangent[1], sample.tangent[0]) * RAD_TO_DEG;
  const angleRad = angleDeg / RAD_TO_DEG;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    left,
    top,
    transforms: [{ kind: 'rotate', degrees: round(angleDeg), cx: round(ax), cy: round(ay) }],
    boundsPoints: corners.map(([x, y]): IRPosition => [
      ax + (x - ax) * cos - (y - ay) * sin,
      ay + (x - ax) * sin + (y - ay) * cos,
    ]),
  };
};

/** 组合共享测量与路径放置，供独立 Definition 标签回调消费 */
export const layoutPathLabel = (
  canon: PathDefinitionLabel,
  sample: CurveSegmentSample,
  context: Omit<PathLabelContext, 'hostOpacity'>,
): CompiledPathLabelLayout => {
  const block = measurePathLabel(canon, context);
  return { block, ...placePathLabel(canon, sample, block, context) };
};

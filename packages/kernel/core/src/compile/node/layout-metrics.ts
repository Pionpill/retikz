import { RAD_TO_DEG, boundsOf, boundsToRect } from '@retikz/math';

import type { LayoutAlignmentGuide, Transform } from '../../contract';
import { BuiltinLayoutAlignmentGuideName, LayoutAlignmentGuideDimension } from '../../contract';
import type { IRPosition } from '../../schemas';
import type { EffectiveScopeTransform } from '../transform';
import { applyScopeTransform, composeScopeTransform, projectLayoutWithTransform } from '../transform';
import type { NodeLayoutObservation } from '../types';
import type { NodeLayout } from './types';

const isEffectiveIdentityRotation = (degrees: number): boolean => Object.is(degrees % 360, -0) || degrees % 360 === 0;

/** 从同次 Node 正文排版结果投影 child-local baseline guides */
export const alignmentGuidesOfNode = (
  layout: NodeLayout,
  round: (value: number) => number,
): Array<LayoutAlignmentGuide> | undefined => {
  const text = layout.text;
  const offsets = text?.baselineOffsets;
  if (
    text === undefined ||
    offsets === undefined ||
    offsets.length === 0 ||
    !isEffectiveIdentityRotation((layout.geometry.rect.rotate ?? 0) * RAD_TO_DEG)
  ) {
    return undefined;
  }

  const blockTop = layout.geometry.contentCenter[1] - layout.geometry.contentSize.height / 2;
  const firstBaseline = round(blockTop + offsets[0]);
  if (text.kind === 'inline') {
    return [
      {
        name: BuiltinLayoutAlignmentGuideName.FirstBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: firstBaseline,
      },
      {
        name: BuiltinLayoutAlignmentGuideName.LastBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: round(blockTop + offsets[offsets.length - 1]),
      },
    ];
  }

  const emittedLineHeight = round(text.lineHeight);

  return [
    {
      name: BuiltinLayoutAlignmentGuideName.FirstBaseline,
      dimension: LayoutAlignmentGuideDimension.Y,
      position: firstBaseline,
    },
    {
      name: BuiltinLayoutAlignmentGuideName.LastBaseline,
      dimension: LayoutAlignmentGuideDimension.Y,
      position: firstBaseline + (offsets.length - 1) * emittedLineHeight,
    },
  ];
};

const contentCorners = (layout: NodeLayout): Array<IRPosition> => {
  const [cx, cy] = layout.geometry.contentCenter;
  const halfW = layout.geometry.contentSize.width / 2;
  const halfH = layout.geometry.contentSize.height / 2;

  return [
    [cx - halfW, cy - halfH],
    [cx + halfW, cy - halfH],
    [cx + halfW, cy + halfH],
    [cx - halfW, cy + halfH],
  ];
};

/** 把节点自身旋转组合到已合成的 Scope 变换 */
const nodeTransformOf = (layout: NodeLayout, transform: EffectiveScopeTransform): EffectiveScopeTransform =>
  (layout.geometry.rect.rotate ?? 0) === 0
    ? transform
    : composeScopeTransform(
        [
          {
            kind: 'rotate',
            degrees: (layout.geometry.rect.rotate ?? 0) * RAD_TO_DEG,
            cx: layout.geometry.rect.x,
            cy: layout.geometry.rect.y,
          },
        ],
        transform,
      );

const contentBounds = (
  layout: NodeLayout,
  transform: EffectiveScopeTransform,
): NodeLayoutObservation['content']['bounds'] => {
  const projected = contentCorners(layout).map(point => applyScopeTransform(point, transform));
  const bounds = boundsOf(projected);
  if (bounds === undefined) {
    return { x: layout.geometry.contentCenter[0], y: layout.geometry.contentCenter[1], width: 0, height: 0 };
  }

  return boundsToRect(bounds);
};

/** 将内部 NodeLayout 收敛为公开 compile 观测 DTO */
export const projectNodeLayoutObservation = (
  layout: NodeLayout,
  scopeChain: ReadonlyArray<Transform>,
  transform: EffectiveScopeTransform = composeScopeTransform(scopeChain),
  id?: string,
): NodeLayoutObservation => {
  const globalLayout = scopeChain.length === 0 ? layout : projectLayoutWithTransform(layout, transform);
  const nodeTransform = nodeTransformOf(layout, transform);
  return {
    kind: 'node',
    ...(id === undefined ? {} : { id }),
    content: {
      center: applyScopeTransform(layout.geometry.contentCenter, nodeTransform),
      size: {
        width: layout.geometry.contentSize.width,
        height: layout.geometry.contentSize.height,
      },
      bounds: contentBounds(layout, nodeTransform),
    },
    rect: {
      x: globalLayout.geometry.rect.x,
      y: globalLayout.geometry.rect.y,
      width: globalLayout.geometry.rect.width,
      height: globalLayout.geometry.rect.height,
      rotate: globalLayout.geometry.rect.rotate ?? 0,
    },
    text: {
      hasInlineTex: globalLayout.text?.kind === 'inline' && globalLayout.text.lines.some(({ laid }) => !laid.isPlain),
      lineCount: globalLayout.text?.lines.length ?? 0,
    },
  };
};

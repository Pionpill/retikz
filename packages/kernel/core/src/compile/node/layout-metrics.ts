import { boundsOf, boundsToRect } from '@retikz/math';

import type { LayoutAlignmentGuide, Transform } from '../../contract';
import type { IRPosition } from '../../schemas';
import type { CompiledNodeLayout } from '../types';
import type { NodeLayout } from './types';

import { LayoutAlignmentGuideDimension, LayoutAlignmentGuideName } from '../../contract';
import { applyTransformChain, projectLayoutToGlobal } from '../transform';

const isEffectiveIdentityRotation = (degrees: number): boolean => Object.is(degrees % 360, -0) || degrees % 360 === 0;

/** 从同次 Node 正文排版结果投影 child-local baseline guides */
export const alignmentGuidesOfNode = (
  layout: NodeLayout,
  round: (value: number) => number,
): Array<LayoutAlignmentGuide> | undefined => {
  const offsets = layout.textBaselineOffsets;
  if (offsets === undefined || offsets.length === 0 || !isEffectiveIdentityRotation(layout.rotateDeg)) {
    return undefined;
  }
  const blockTop = layout.contentCenter[1] - layout.textHeight / 2;
  const firstBaseline = round(blockTop + offsets[0]);
  if (layout.inlineBlock !== undefined) {
    return [
      {
        name: LayoutAlignmentGuideName.FirstBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: firstBaseline,
      },
      {
        name: LayoutAlignmentGuideName.LastBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: round(blockTop + offsets[offsets.length - 1]),
      },
    ];
  }
  const emittedLineHeight = round(layout.lineHeight);
  return [
    {
      name: LayoutAlignmentGuideName.FirstBaseline,
      dimension: LayoutAlignmentGuideDimension.Y,
      position: firstBaseline,
    },
    {
      name: LayoutAlignmentGuideName.LastBaseline,
      dimension: LayoutAlignmentGuideDimension.Y,
      position: firstBaseline + (offsets.length - 1) * emittedLineHeight,
    },
  ];
};

const contentCorners = (layout: NodeLayout): Array<IRPosition> => {
  const [cx, cy] = layout.contentCenter;
  const halfW = layout.textWidth / 2;
  const halfH = layout.textHeight / 2;
  return [
    [cx - halfW, cy - halfH],
    [cx + halfW, cy - halfH],
    [cx + halfW, cy + halfH],
    [cx - halfW, cy + halfH],
  ];
};

const nodeTransformChain = (layout: NodeLayout, scopeChain: ReadonlyArray<Transform>): ReadonlyArray<Transform> =>
  layout.rotateDeg === 0
    ? scopeChain
    : [
        ...scopeChain,
        {
          kind: 'rotate',
          degrees: layout.rotateDeg,
          cx: layout.rect.x,
          cy: layout.rect.y,
        },
      ];

const contentBounds = (
  layout: NodeLayout,
  scopeChain: ReadonlyArray<Transform>,
): CompiledNodeLayout['content']['bounds'] => {
  const projected = contentCorners(layout).map(point =>
    applyTransformChain(point, nodeTransformChain(layout, scopeChain)),
  );
  const bounds = boundsOf(projected);
  if (bounds === undefined) {
    return { x: layout.contentCenter[0], y: layout.contentCenter[1], width: 0, height: 0 };
  }
  return boundsToRect(bounds);
};

/** 将内部 NodeLayout 收敛为公开 compile 观测 DTO */
export const computeCompiledNodeLayout = (
  layout: NodeLayout,
  scopeChain: ReadonlyArray<Transform>,
): CompiledNodeLayout => {
  const globalLayout = scopeChain.length === 0 ? layout : projectLayoutToGlobal(layout, scopeChain);
  return {
    kind: 'node',
    ...(layout.id === undefined ? {} : { id: layout.id }),
    content: {
      center: applyTransformChain(layout.contentCenter, nodeTransformChain(layout, scopeChain)),
      size: {
        width: layout.textWidth,
        height: layout.textHeight,
      },
      bounds: contentBounds(layout, scopeChain),
    },
    rect: {
      x: globalLayout.rect.x,
      y: globalLayout.rect.y,
      width: globalLayout.rect.width,
      height: globalLayout.rect.height,
      rotate: globalLayout.rect.rotate ?? 0,
    },
    text: {
      hasInlineTex: globalLayout.inlineBlock?.lines.some(({ laid }) => !laid.isPlain) ?? false,
      lineCount: globalLayout.inlineBlock?.lines.length ?? globalLayout.lines?.length ?? 0,
    },
  };
};

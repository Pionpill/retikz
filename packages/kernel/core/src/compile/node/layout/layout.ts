import { DEG_TO_RAD } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import type { CanonicalNode } from '../../../resolve';
import type { IRAnchorPosition, IRPosition } from '../../../schemas';
import { evaluatePosition } from '../../reference';
import { composeScopeTransform } from '../../shared';
import { createNodeBoundaryStore } from '../boundary-store';
import type { CompiledNodeLayout, NodeCompileContext } from '../types';
import { layoutNodeLabels, measureNodeLabels } from './label';
import { isAnchorPosition, placeAnchorPositionedLayout } from './placement';
import { sizeNode } from './sizing';
import { createNodeTextMeasurer } from './text';

/** 按文本测量、节点缩放与父级宽度提案计算正文、形状和边界布局 */
export const layoutNode = (
  canon: CanonicalNode,
  context: Omit<NodeCompileContext, 'round' | 'registerPaint'>,
): CompiledNodeLayout => {
  const { shape, boundary } = canon;
  const {
    irPath = [],
    measureText,
    positionContext,
    scopeChain = [],
    texLowering,
    warn,
    nodeBoundaryStore = createNodeBoundaryStore(),
    composedTransform,
  } = context;

  const { contentLayout, circumscribed, margin, paddingOffsetX, paddingOffsetY, boundsHalfW, boundsHalfH } = sizeNode(
    canon,
    { ...context, measureText: createNodeTextMeasurer(measureText) },
  );
  const { textWidth, textHeight, textBaselineOffsets, lines, inlineBlock } = contentLayout;
  const lineHeight = canon.text?.lineHeight ?? 0;
  const align = canon.text?.align ?? 'middle';
  const rotateDeg = canon.layout.rotate;

  let anchorPosition: IRAnchorPosition | undefined;
  let center: IRPosition | null;
  if (isAnchorPosition(canon.layout.position)) {
    anchorPosition = canon.layout.position;
    center = [0, 0];
  } else {
    center = evaluatePosition(canon.layout.position, positionContext)?.localPoint ?? null;
  }

  if (!center) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Cannot resolve position for node ${canon.id ?? '(unnamed)'}; polar.origin / at.of / between endpoint may reference an undefined node`,
    );
  }

  // shape 可声明 AABB 中心相对 position 的偏移。
  const aabbOffset = circumscribed.offset;
  const rectCenterX = center[0] + paddingOffsetX + (aabbOffset?.[0] ?? 0);
  const rectCenterY = center[1] + paddingOffsetY + (aabbOffset?.[1] ?? 0);
  const contentCenter: [number, number] = [rectCenterX - paddingOffsetX, rectCenterY - paddingOffsetY];
  const measuredLabels = measureNodeLabels({
    canon,
    measureText,
    tex: texLowering,
  });

  const provisional: CompiledNodeLayout = {
    shape,
    geometry: {
      rect: {
        // x, y 是外接 AABB 几何中心。
        x: rectCenterX,
        y: rectCenterY,
        width: 2 * boundsHalfW,
        height: 2 * boundsHalfH,
        // geometry 用弧度。
        rotate: rotateDeg * DEG_TO_RAD,
      },
      contentCenter,
      margin,
      contentSize: { width: textWidth, height: textHeight },
    },
    text:
      inlineBlock !== undefined
        ? {
            kind: 'inline',
            lines: inlineBlock.lines,
            align,
            lineHeight,
            baselineOffsets: textBaselineOffsets,
            font: canon.text!.font,
          }
        : lines === undefined
          ? undefined
          : {
              kind: 'plain',
              lines,
              align,
              lineHeight,
              baselineOffsets: textBaselineOffsets,
              font: canon.text!.font,
            },
    boundary,
  };
  const boundaryState = nodeBoundaryStore.get(provisional);
  boundaryState.warn = warn;
  boundaryState.irPath = irPath;
  const resolved: CompiledNodeLayout = {
    ...provisional,
    labels: layoutNodeLabels(provisional, measuredLabels),
  };

  if (anchorPosition === undefined) return resolved;
  return placeAnchorPositionedLayout(
    canon,
    anchorPosition,
    resolved,
    positionContext,
    composedTransform ?? composeScopeTransform(scopeChain),
    nodeBoundaryStore,
  );
};

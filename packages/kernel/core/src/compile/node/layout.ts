import { formatPropertyPath } from '@retikz/foundation';
import { DEG_TO_RAD } from '@retikz/math';

import { LayoutAxisProposalKind, LayoutIntrinsicMode } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { CanonicalNode, CanonicalPosition } from '../../resolve';
import type { IRAnchorPosition, IRPosition } from '../../schemas';
import { CenterAnchor } from '../../shared';
import type { BoundaryState } from '../boundary';
import { evaluateAnchorReference, projectLayoutWithTransform } from '../boundary';
import type { PositionTargetEvaluateContext } from '../reference';
import { evaluatePosition, evaluatePositionTargetWorld } from '../reference';
import type { ComposedScopeTransform } from '../shared';
import { composeScopeTransform, inverseScopeTransform } from '../shared';
import { layoutNodeContent } from './content';
import { layoutNodeLabels, measureNodeLabels } from './label';
import { layoutNodeShape } from './shape';
import type { CompiledNodeLayout, NodeCompileContext } from './types';

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
    boundaryState,
    composedTransform,
  } = context;

  const { contentLayout, circumscribed, margin, paddingOffsetX, paddingOffsetY, boundsHalfW, boundsHalfH } =
    measureNode(canon, context);
  const { textWidth, textHeight, textBaselineOffsets, lines, inlineBlock } = contentLayout;
  const lineHeight = canon.text?.lineHeight ?? 0;
  const align = canon.text?.textAlign ?? 'middle';
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
    boundaryState ?? { warn, irPath },
  );
};

/** 自定义形状反馈的最大重排次数 */
const MAX_ALLOCATION_REFLOW_ATTEMPTS = 32;

/** 求得正文与形状的最终尺寸 */
const measureNode = (canon: CanonicalNode, context: Omit<NodeCompileContext, 'round' | 'registerPaint'>) => {
  const { measureText, texLowering, allocationWidthProposal, irPath = [] } = context;
  const {
    padding: { left: paddingLeft, right: paddingRight, top: paddingTop, bottom: paddingBottom },
    margin,
    minimumSize,
    width: fixedVisualWidth,
    rotate: rotateDeg,
  } = canon.layout;
  const explicitMaxTextWidth = canon.text?.maxTextWidth;
  const lineHeight = canon.text?.lineHeight ?? 0;
  const proposedAllocationWidth =
    allocationWidthProposal?.kind === LayoutAxisProposalKind.Exact
      ? allocationWidthProposal.value
      : allocationWidthProposal?.kind === LayoutAxisProposalKind.Range
        ? allocationWidthProposal.max
        : undefined;
  const minimumTextWidth =
    allocationWidthProposal?.kind === LayoutAxisProposalKind.Intrinsic &&
    allocationWidthProposal.mode === LayoutIntrinsicMode.Minimum;

  const minHalfW = minimumSize.width / 2;
  const minHalfH = minimumSize.height / 2;

  const allocationWidthOf = (halfWidth: number, halfHeight: number): number => {
    const outerWidth = 2 * Math.max(halfWidth, minHalfW) + margin.left + margin.right;
    const outerHeight = 2 * Math.max(halfHeight, minHalfH) + margin.top + margin.bottom;
    const rotateRad = rotateDeg * DEG_TO_RAD;

    return Math.abs(outerWidth * Math.cos(rotateRad)) + Math.abs(outerHeight * Math.sin(rotateRad));
  };

  /** 前向求值一个正文 budget 对应的真实 content、shape 与 allocation width */
  const evaluateContentCandidate = (textWidthBudget: number | undefined) => {
    const contentLayout = layoutNodeContent({
      canon,
      measureText,
      tex: texLowering,
      lineHeight,
      maxTextWidth: textWidthBudget,
      minimumTextWidth,
    });
    const circumscribed = layoutNodeShape(
      canon.shape,
      (contentLayout.textWidth + paddingLeft + paddingRight) / 2,
      (contentLayout.textHeight + paddingTop + paddingBottom) / 2,
    );

    return {
      contentLayout,
      circumscribed,
      allocationWidth: allocationWidthOf(circumscribed.halfWidth, circumscribed.halfHeight),
      visualWidth: 2 * circumscribed.halfWidth,
    };
  };

  // 自定义形状反馈有界，避免无法满足的预算导致无限重排
  const selectCandidate = () => {
    let selectedCandidate = evaluateContentCandidate(explicitMaxTextWidth);
    const widthConstraint = fixedVisualWidth ?? proposedAllocationWidth;
    const candidateWidth = (candidate: ReturnType<typeof evaluateContentCandidate>): number =>
      fixedVisualWidth === undefined ? candidate.allocationWidth : candidate.visualWidth;
    if (
      widthConstraint === undefined ||
      candidateWidth(selectedCandidate) <= widthConstraint ||
      canon.text === undefined
    )
      return selectedCandidate;
    let currentCandidate = selectedCandidate;
    let textWidthBudget = explicitMaxTextWidth ?? currentCandidate.contentLayout.textWidth;

    for (let attempt = 0; attempt < MAX_ALLOCATION_REFLOW_ATTEMPTS; attempt += 1) {
      if (textWidthBudget === 0) break;
      const ratio = widthConstraint / candidateWidth(currentCandidate);
      const decrement = Math.max(Number.EPSILON, Math.abs(textWidthBudget) * Number.EPSILON);
      const nextBudget = Math.max(
        0,
        Math.min(textWidthBudget - decrement, currentCandidate.contentLayout.textWidth * ratio),
      );
      if (!(nextBudget < textWidthBudget)) break;
      textWidthBudget = nextBudget;
      currentCandidate = evaluateContentCandidate(textWidthBudget);
      if (candidateWidth(currentCandidate) < candidateWidth(selectedCandidate)) selectedCandidate = currentCandidate;
      if (candidateWidth(currentCandidate) <= widthConstraint) {
        selectedCandidate = currentCandidate;
        break;
      }
    }
    return selectedCandidate;
  };
  const selectedCandidate = selectCandidate();

  if (fixedVisualWidth !== undefined && selectedCandidate.visualWidth > fixedVisualWidth) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `${formatPropertyPath(irPath)}.layout.width cannot contain the Node content, padding, and shape geometry`,
    );
  }

  const { contentLayout, circumscribed } = selectedCandidate;

  const paddingOffsetX = (paddingRight - paddingLeft) / 2;
  const paddingOffsetY = (paddingBottom - paddingTop) / 2;
  const boundsHalfW =
    fixedVisualWidth === undefined ? Math.max(circumscribed.halfWidth, minHalfW) : fixedVisualWidth / 2;
  const boundsHalfH = Math.max(circumscribed.halfHeight, minHalfH);

  return { contentLayout, circumscribed, margin, paddingOffsetX, paddingOffsetY, boundsHalfW, boundsHalfH };
};

/** 判断 Node.position 是否为锚点对锚点定位 */
const isAnchorPosition = (
  position: CanonicalPosition | Required<IRAnchorPosition>,
): position is Required<IRAnchorPosition> => !Array.isArray(position) && 'kind' in position;

/** 把全局位移反投影为当前 Scope 的局部位移 */
const localDeltaOf = (
  deltaGlobal: IRPosition,
  globalOrigin: IRPosition,
  transform: ComposedScopeTransform,
): IRPosition => {
  if (transform.chain.length === 0) return deltaGlobal;
  if (transform.inverse === null) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      'Cannot resolve anchor position through a Scope transform with a zero scale axis',
    );
  }

  const before = inverseScopeTransform(globalOrigin, transform);
  const after = inverseScopeTransform([globalOrigin[0] + deltaGlobal[0], globalOrigin[1] + deltaGlobal[1]], transform);

  return [after[0] - before[0], after[1] - before[1]];
};

/** 根据 target 与 self anchor 平移完整 provisional layout */
const placeAnchorPositionedLayout = (
  canon: CanonicalNode,
  position: IRAnchorPosition,
  provisional: CompiledNodeLayout,
  positionContext: PositionTargetEvaluateContext,
  transform: ComposedScopeTransform,
  boundaryState: BoundaryState,
): CompiledNodeLayout => {
  if (canon.id === position.target.id || canon.aliasIds.includes(position.target.id)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Node anchor position cannot reference itself ('${canon.id}')`,
    );
  }

  const reference = positionContext.lookupReference(position.target.id, 'position');
  if (reference === undefined) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Cannot resolve anchor position target '${position.target.id}'; it is undefined or defined later in the IR`,
    );
  }

  if (reference.state === 'scope-placeholder') {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Cannot resolve anchor position target '${position.target.id}'; the referenced Scope is still being laid out`,
    );
  }

  const target = evaluatePositionTargetWorld(position.target, positionContext);
  if (target.referencePoint === null) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Cannot resolve anchor position target '${position.target.id}'; it is undefined or defined later in the IR`,
    );
  }

  const projected = transform.chain.length === 0 ? provisional : projectLayoutWithTransform(provisional, transform);
  const selfPoint = evaluateAnchorReference(
    projected,
    position.selfAnchor ?? CenterAnchor.Center,
    undefined,
    canon.boundary,
    boundaryState,
  );
  const deltaGlobal: IRPosition = [target.referencePoint[0] - selfPoint[0], target.referencePoint[1] - selfPoint[1]];
  const deltaLocal = localDeltaOf(deltaGlobal, [projected.geometry.rect.x, projected.geometry.rect.y], transform);

  return {
    ...provisional,
    geometry: {
      ...provisional.geometry,
      rect: {
        ...provisional.geometry.rect,
        x: provisional.geometry.rect.x + deltaLocal[0],
        y: provisional.geometry.rect.y + deltaLocal[1],
      },
      contentCenter: [
        provisional.geometry.contentCenter[0] + deltaLocal[0],
        provisional.geometry.contentCenter[1] + deltaLocal[1],
      ],
    },
  };
};

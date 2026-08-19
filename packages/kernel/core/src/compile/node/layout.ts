import type { LayoutAxisProposal, Transform } from '../../contract';
import type { CanonicalNode, NodeResolution } from '../../resolve';
import type { PositionTargetResolveContext } from '../../resolve/position';
import type { IRAnchorPosition, IRPosition } from '../../schemas';
import type { TextMeasurer } from '../text';
import type { CompileWarningCodeValue } from '../warning';
import type { NodeLayout, TexLoweringContext } from './types';

import { LayoutAxisProposalKind, LayoutIntrinsicMode } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import {
  isFatalProbeError,
  isRetikzLayoutProbeRecoverableError,
  RetikzCompositeContractError,
  RetikzLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve/diagnostics';
import { resolvePosition, resolvePositionTargetWorld } from '../../resolve/position';
import { resolveFont, resolveTextLineHeight } from '../../resolve/text';
import { CenterAnchor } from '../../shared';
import { DEG_TO_RAD } from '../../shared/geometry';
import { DEFAULT_FONT_SIZE } from '../constants';
import { resolveAnchorRefUncached } from '../reference';
import { snapshotProviderPosition, withProviderOutputValidationBoundary } from '../scene-primitive';
import { inverseTransformChain, isTransformChainInvertible, projectLayoutToGlobal } from '../transform';
import { layoutNodeContent } from './content/layout';
import { layoutNodeLabels, measureNodeLabels } from './label/layout';

/** 限制 custom circumscribe 反馈次数，保证 proposal 求值有确定上界 */
const MAX_ALLOCATION_REFLOW_ATTEMPTS = 32;

/** 判断 Node.position 是否为锚点对锚点定位 */
const isAnchorPosition = (position: CanonicalNode['position']): position is IRAnchorPosition =>
  !Array.isArray(position) && 'kind' in position;

/** 把全局位移反投影为当前 Scope 的局部位移 */
const localDeltaOf = (
  deltaGlobal: IRPosition,
  globalOrigin: IRPosition,
  scopeChain: ReadonlyArray<Transform>,
): IRPosition => {
  if (scopeChain.length === 0) return deltaGlobal;
  if (!isTransformChainInvertible(scopeChain)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      'Cannot resolve anchor position through a Scope transform with a zero scale axis',
    );
  }
  const before = inverseTransformChain(globalOrigin, scopeChain);
  const after = inverseTransformChain([globalOrigin[0] + deltaGlobal[0], globalOrigin[1] + deltaGlobal[1]], scopeChain);
  return [after[0] - before[0], after[1] - before[1]];
};

/** 根据 target 与 self anchor 平移完整 provisional layout */
const placeAnchorPositionedLayout = (
  node: CanonicalNode,
  position: IRAnchorPosition,
  provisional: NodeLayout,
  positionContext: PositionTargetResolveContext,
  scopeChain: ReadonlyArray<Transform>,
): NodeLayout => {
  if (node.id !== undefined && node.id === position.target.id) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Node anchor position cannot reference itself ('${node.id}')`,
    );
  }
  const reference = positionContext.lookupReference(position.target.id);
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
  const target = resolvePositionTargetWorld(position.target, positionContext);
  if (target.referencePoint === null) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Cannot resolve anchor position target '${position.target.id}'; it is undefined or defined later in the IR`,
    );
  }
  const projected =
    scopeChain.length === 0
      ? { ...provisional, rect: { ...provisional.rect } }
      : projectLayoutToGlobal(provisional, scopeChain);
  const selfPoint = resolveAnchorRefUncached(projected, position.selfAnchor ?? CenterAnchor.Center, node.boundary);
  const deltaGlobal: IRPosition = [target.referencePoint[0] - selfPoint[0], target.referencePoint[1] - selfPoint[1]];
  const deltaLocal = localDeltaOf(deltaGlobal, [projected.rect.x, projected.rect.y], scopeChain);

  return {
    ...provisional,
    rect: {
      ...provisional.rect,
      x: provisional.rect.x + deltaLocal[0],
      y: provisional.rect.y + deltaLocal[1],
    },
    contentCenter: [provisional.contentCenter[0] + deltaLocal[0], provisional.contentCenter[1] + deltaLocal[1]],
  };
};

/** 节点 layout 阶段使用的编译依赖 */
export type LayoutNodeContext = {
  /** 文本测量函数 */
  measureText: TextMeasurer;
  /** Position/Target Source IR 确定化上下文 */
  positionContext: PositionTargetResolveContext;
  /** preset 与 rem 字号解析的根字号 */
  rootFontSize?: number;
  /** 当前 scope 累积 transform */
  scopeChain?: ReadonlyArray<Transform>;
  /** TeX 降级上下文 */
  texLowering?: TexLoweringContext;
  /** 当前 node 的 compile warning 分发函数 */
  warn?: (code: CompileWarningCodeValue, message: string) => void;
  /** 父级给 allocation box 的水平 proposal */
  allocationWidthProposal?: LayoutAxisProposal;
};

export const layoutNode = (resolution: NodeResolution, context: LayoutNodeContext): NodeLayout => {
  const { node, shape: shapeResolution, boundary: boundaryResolution } = resolution;
  const {
    measureText,
    positionContext,
    rootFontSize = DEFAULT_FONT_SIZE,
    scopeChain = [],
    texLowering,
    warn,
    allocationWidthProposal,
  } = context;
  // 缩放影响节点尺寸与字体。
  // 字号取 min(sx,sy) 保 glyph 形状，避免非均匀缩放下文字被拉变形。
  const { x: sx, y: sy } = node.scale;
  const fontScale = Math.min(sx, sy);
  const { name: shapeName, definition: shapeDef, params: shapeParams } = shapeResolution;

  const baseFont = resolveFont(node.font, {
    rootFontSize,
    inheritedFont: { size: rootFontSize },
  });
  const baseFontSize = baseFont.size;
  const fontSize = baseFontSize * fontScale;
  const fontFamily = baseFont.family;
  const fontWeight = baseFont.weight;
  const fontStyle = baseFont.style;
  // spacing 受 node scale 影响。
  const padding = node.padding;
  const paddingLeft = padding.left * sx;
  const paddingRight = padding.right * sx;
  const paddingTop = padding.top * sy;
  const paddingBottom = padding.bottom * sy;
  const marginSpacing = node.margin;
  const margin = {
    top: marginSpacing.top * sy,
    right: marginSpacing.right * sx,
    bottom: marginSpacing.bottom * sy,
    left: marginSpacing.left * sx,
  };
  const lineHeight = resolveTextLineHeight(node.lineHeight, baseFontSize) * sy;
  const align = node.align;

  // 折行阈值受 x 缩放。
  const explicitMaxTextWidth = node.maxTextWidth !== undefined ? node.maxTextWidth * sx : undefined;
  const proposedAllocationWidth =
    allocationWidthProposal?.kind === LayoutAxisProposalKind.Exact
      ? allocationWidthProposal.value
      : allocationWidthProposal?.kind === LayoutAxisProposalKind.Range
        ? allocationWidthProposal.max
        : undefined;
  const minimumTextWidth =
    allocationWidthProposal?.kind === LayoutAxisProposalKind.Intrinsic &&
    allocationWidthProposal.mode === LayoutIntrinsicMode.Minimum;

  /** 使用同一正文 owner 与 measurer 求当前 wrap budget 的真实内容布局 */
  const layoutContent = (textWidthBudget: number | undefined) =>
    layoutNodeContent({
      node,
      measureText,
      texLowering,
      fontSize,
      baseFontSize,
      fontScale,
      rootFontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      lineHeight,
      maxTextWidth: textWidthBudget,
      minimumTextWidth,
    });

  // minimumSize 作用于外接边界，且随 scale 缩放。
  const minimumSize = node.minimumSize;
  const minHalfW = (minimumSize.width * sx) / 2;
  const minHalfH = (minimumSize.height * sy) / 2;
  const circumscribeContent = (textWidth: number, textHeight: number) => {
    let raw: unknown;
    try {
      raw = shapeDef.circumscribe(
        (textWidth + paddingLeft + paddingRight) / 2,
        (textHeight + paddingTop + paddingBottom) / 2,
        shapeParams,
      );
    } catch (thrown) {
      if (isFatalProbeError(thrown) || isRetikzLayoutProbeRecoverableError(thrown)) throw thrown;
      throw new RetikzLayoutProbeRecoverableError(
        `Shape '${shapeDef.name}' circumscribe failed: ${safeThrownDetail(thrown)}`,
        { cause: thrown, providerKey: `shape:${shapeDef.name}` },
      );
    }
    return withProviderOutputValidationBoundary(`Shape '${shapeDef.name}' circumscribe`, () => {
      if (raw === null || typeof raw !== 'object') {
        throw new RetikzCompositeContractError(
          `Shape '${shapeDef.name}' returned invalid circumscribe geometry; halfWidth and halfHeight must be finite non-negative numbers`,
        );
      }
      const halfWidth = 'halfWidth' in raw ? raw.halfWidth : undefined;
      const halfHeight = 'halfHeight' in raw ? raw.halfHeight : undefined;
      if (
        typeof halfWidth !== 'number' ||
        typeof halfHeight !== 'number' ||
        !Number.isFinite(halfWidth) ||
        !Number.isFinite(halfHeight) ||
        halfWidth < 0 ||
        halfHeight < 0
      ) {
        throw new RetikzCompositeContractError(
          `Shape '${shapeDef.name}' returned invalid circumscribe geometry; halfWidth and halfHeight must be finite non-negative numbers`,
        );
      }
      return { halfWidth, halfHeight };
    });
  };
  const rotateDeg = node.rotate;
  const allocationWidthOf = (halfWidth: number, halfHeight: number): number => {
    const outerWidth = 2 * Math.max(halfWidth, minHalfW) + margin.left + margin.right;
    const outerHeight = 2 * Math.max(halfHeight, minHalfH) + margin.top + margin.bottom;
    const rotateRad = rotateDeg * DEG_TO_RAD;
    return Math.abs(outerWidth * Math.cos(rotateRad)) + Math.abs(outerHeight * Math.sin(rotateRad));
  };
  /** 前向求值一个正文 budget 对应的真实 content、shape 与 allocation width */
  const evaluateContentCandidate = (textWidthBudget: number | undefined) => {
    const contentLayout = layoutContent(textWidthBudget);
    const circumscribed = circumscribeContent(contentLayout.textWidth, contentLayout.textHeight);
    return {
      contentLayout,
      circumscribed,
      allocationWidth: allocationWidthOf(circumscribed.halfWidth, circumscribed.halfHeight),
    };
  };

  let selectedCandidate = evaluateContentCandidate(explicitMaxTextWidth);
  if (
    proposedAllocationWidth !== undefined &&
    selectedCandidate.allocationWidth > proposedAllocationWidth &&
    selectedCandidate.contentLayout.lines !== undefined
  ) {
    let currentCandidate = selectedCandidate;
    let textWidthBudget = explicitMaxTextWidth ?? currentCandidate.contentLayout.textWidth;
    for (let attempt = 0; attempt < MAX_ALLOCATION_REFLOW_ATTEMPTS; attempt += 1) {
      if (textWidthBudget === 0) break;
      const ratio = proposedAllocationWidth / currentCandidate.allocationWidth;
      const decrement = Math.max(Number.EPSILON, Math.abs(textWidthBudget) * Number.EPSILON);
      const nextBudget = Math.max(
        0,
        Math.min(textWidthBudget - decrement, currentCandidate.contentLayout.textWidth * ratio),
      );
      if (!(nextBudget < textWidthBudget)) break;
      textWidthBudget = nextBudget;
      currentCandidate = evaluateContentCandidate(textWidthBudget);
      if (currentCandidate.allocationWidth < selectedCandidate.allocationWidth) selectedCandidate = currentCandidate;
      if (currentCandidate.allocationWidth <= proposedAllocationWidth) {
        selectedCandidate = currentCandidate;
        break;
      }
    }
  }
  const { contentLayout, circumscribed } = selectedCandidate;
  const { textWidth, textHeight, textBaselineOffsets, lines, inlineBlock } = contentLayout;

  const paddingOffsetX = (paddingRight - paddingLeft) / 2;
  const paddingOffsetY = (paddingBottom - paddingTop) / 2;
  const boundsHalfW = Math.max(circumscribed.halfWidth, minHalfW);
  const boundsHalfH = Math.max(circumscribed.halfHeight, minHalfH);

  let anchorPosition: IRAnchorPosition | undefined;
  let center: IRPosition | null;
  if (isAnchorPosition(node.position)) {
    anchorPosition = node.position;
    center = [0, 0];
  } else {
    center = resolvePosition(node.position, positionContext)?.localPoint ?? null;
  }
  if (!center) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Cannot resolve position for node ${node.id ?? '(unnamed)'}; polar.origin / at.of / between endpoint may reference an undefined node`,
    );
  }
  // shape 可声明 AABB 中心相对 position 的偏移。
  const rawAabbOffset: unknown = shapeDef.circumscribeOffset?.(shapeParams);
  const aabbOffset =
    rawAabbOffset === undefined
      ? undefined
      : snapshotProviderPosition(`Shape '${shapeDef.name}' circumscribeOffset`, rawAabbOffset);
  const rectCenterX = center[0] + paddingOffsetX + (aabbOffset?.[0] ?? 0);
  const rectCenterY = center[1] + paddingOffsetY + (aabbOffset?.[1] ?? 0);
  const contentCenter: [number, number] = [rectCenterX - paddingOffsetX, rectCenterY - paddingOffsetY];
  const measuredLabels = measureNodeLabels({
    node,
    measureText,
    texLowering,
    baseFontSize,
    rootFontSize,
    fontScale,
    fontFamily,
    fontWeight,
    fontStyle,
  });

  const provisional: NodeLayout = {
    irPath: resolution.irPath,
    id: node.id,
    shapeName,
    shapeDef,
    shapeParams,
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
    rotateDeg,
    margin,
    lines,
    inlineBlock,
    textWidth,
    textHeight,
    textBaselineOffsets,
    align,
    lineHeight,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    fill: node.fill,
    fillResolution: resolution.paint.fill,
    fillOpacity: node.fillOpacity,
    stroke: node.stroke,
    strokeResolution: resolution.paint.stroke,
    strokeOpacity: node.strokeOpacity,
    strokeWidth: node.strokeWidth,
    dashPattern: node.dashPattern,
    dashOffset: node.dashOffset,
    cornerRadius: node.cornerRadius,
    textColor: node.textColor,
    opacity: node.opacity,
    shadow: node.shadow,
    blendMode: node.blendMode,
    boundary: node.boundary,
    boundaryResolution,
    meta: node.meta,
    animations: node.animations,
    connectionEnvelopeCache: new Map(),
    connectionEnvelopeWarnings: new Set(),
    warn,
  };
  const resolved: NodeLayout = {
    ...provisional,
    labels: layoutNodeLabels(provisional, measuredLabels),
  };
  return anchorPosition
    ? placeAnchorPositionedLayout(node, anchorPosition, resolved, positionContext, scopeChain)
    : resolved;
};

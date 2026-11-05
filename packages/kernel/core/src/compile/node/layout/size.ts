import { formatPropertyPath } from '@retikz/foundation';
import { DEG_TO_RAD } from '@retikz/math';

import type { ShapeCircumscribedGeometry } from '../../../contract';
import { LayoutAxisProposalKind, LayoutIntrinsicMode } from '../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import type { CanonicalNode } from '../../../resolve';
import {
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  guardProviderOutput,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../../resolve';
import { snapshotProviderPosition } from '../../shared';
import type { NodeCompileContext } from '../types';
import { layoutNodeContent } from './content';

/** 自定义形状反馈的最大重排次数 */
const MAX_ALLOCATION_REFLOW_ATTEMPTS = 32;

/** 求得正文与形状的最终尺寸 */
export const sizeNode = (canon: CanonicalNode, context: Omit<NodeCompileContext, 'round' | 'registerPaint'>) => {
  const { measureText, texLowering, allocationWidthProposal, irPath = [] } = context;
  // 缩放影响节点尺寸与字体。
  // 字号取 min(sx,sy) 保 glyph 形状，避免非均匀缩放下文字被拉变形。
  const { x: sx, y: sy } = canon.layout.scale;
  const { definition, params: shapeParams } = canon.shape;

  // spacing 受 node scale 影响。
  const padding = canon.layout.padding;
  const paddingLeft = padding.left * sx;
  const paddingRight = padding.right * sx;
  const paddingTop = padding.top * sy;
  const paddingBottom = padding.bottom * sy;
  const marginSpacing = canon.layout.margin;
  const margin = {
    top: marginSpacing.top * sy,
    right: marginSpacing.right * sx,
    bottom: marginSpacing.bottom * sy,
    left: marginSpacing.left * sx,
  };
  const lineHeight = canon.text?.lineHeight ?? 0;

  // 折行阈值受 x 缩放。
  const explicitMaxTextWidth = canon.layout.maxTextWidth !== undefined ? canon.layout.maxTextWidth * sx : undefined;
  const fixedVisualWidth = canon.layout.width === undefined ? undefined : canon.layout.width * sx;
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
      canon,
      measureText,
      tex: texLowering,
      lineHeight,
      maxTextWidth: textWidthBudget,
      minimumTextWidth,
    });

  // minimumSize 作用于外接边界，且随 scale 缩放。
  const minimumSize = canon.layout.minimumSize;
  const minHalfW = (minimumSize.width * sx) / 2;
  const minHalfH = (minimumSize.height * sy) / 2;

  const circumscribeContent = (textWidth: number, textHeight: number) => {
    let raw: ShapeCircumscribedGeometry;

    try {
      raw = definition.computeCircumscribedGeometry(
        (textWidth + paddingLeft + paddingRight) / 2,
        (textHeight + paddingTop + paddingBottom) / 2,
        shapeParams,
      );
    } catch (thrown) {
      if (isFatalProbeError(thrown) || isLayoutProbeRecoverableError(thrown)) throw thrown;

      throw createLayoutProbeRecoverableError(
        `Shape '${definition.name}' circumscribe failed: ${safeThrownDetail(thrown)}`,
        { cause: thrown, providerKey: `shape:${definition.name}` },
      );
    }

    return guardProviderOutput(`Shape '${definition.name}' circumscribe`, () => {
      const { halfWidth, halfHeight, offset: rawOffset } = raw;
      if (!Number.isFinite(halfWidth) || !Number.isFinite(halfHeight) || halfWidth < 0 || halfHeight < 0) {
        throw createCompositeContractError(
          `Shape '${definition.name}' returned invalid circumscribe geometry; halfWidth and halfHeight must be finite non-negative numbers`,
        );
      }

      const offset =
        rawOffset === undefined
          ? undefined
          : snapshotProviderPosition(`Shape '${definition.name}' computeCircumscribedGeometry.offset`, rawOffset);

      return { halfWidth, halfHeight, offset };
    });
  };

  const rotateDeg = canon.layout.rotate;

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
      selectedCandidate.contentLayout.lines === undefined
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

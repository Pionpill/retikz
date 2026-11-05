import { formatPropertyPath } from '@retikz/foundation';
import { DEG_TO_RAD } from '@retikz/math';

import { LayoutAxisProposalKind, LayoutIntrinsicMode } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { CanonicalNode } from '../../resolve';
import { layoutNodeContent } from './content';
import { layoutNodeShape } from './shape';
import type { NodeCompileContext, PreparedNodeLayout } from './types';

/** 自定义形状反馈的最大重排次数 */
const MAX_ALLOCATION_REFLOW_ATTEMPTS = 32;

/** 求得正文与形状的最终尺寸 */
export const measureNodeBody = (
  canon: CanonicalNode,
  context: Pick<NodeCompileContext, 'measureText' | 'texLowering' | 'allocationWidthProposal' | 'irPath'>,
  prepared?: Pick<PreparedNodeLayout, 'content' | 'shape'>,
): Required<Pick<PreparedNodeLayout, 'content' | 'shape'>> => {
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

  if (prepared?.shape !== undefined) {
    const content =
      prepared.content ??
      layoutNodeContent({
        canon,
        measureText,
        texLowering,
        lineHeight,
        maxTextWidth: prepared.shape.contentWidthBudget,
        minimumTextWidth,
      });
    return { content, shape: prepared.shape };
  }

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
    const contentLayout =
      prepared?.content ??
      layoutNodeContent({
        canon,
        measureText,
        texLowering,
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
    if (prepared?.content !== undefined) return selectedCandidate;
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

  const boundsHalfW =
    fixedVisualWidth === undefined ? Math.max(circumscribed.halfWidth, minHalfW) : fixedVisualWidth / 2;
  const boundsHalfH = Math.max(circumscribed.halfHeight, minHalfH);

  return {
    content: contentLayout,
    shape: {
      contentWidthBudget: contentLayout.widthBudget,
      size: { width: 2 * boundsHalfW, height: 2 * boundsHalfH },
      offset: circumscribed.offset,
    },
  };
};

import type {
  LayoutAxisProposal,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
  LayoutProposal,
} from '@retikz/core';

import { requiredLayoutProbe } from '@retikz/layout/compose';

import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRBlock } from '../../schemas';

import { resolveBlock } from '../../resolve';
import { lowerBlockSurface } from './lower';

const blockAxisProposal = (
  proposal: LayoutAxisProposal,
  width: number | undefined,
  minWidth: number | undefined,
): LayoutAxisProposal => {
  if (proposal.kind === 'exact') return proposal;
  if (width !== undefined) {
    if (proposal.kind === 'range') {
      const value = Math.min(Math.max(width, proposal.min), proposal.max ?? width);
      return { kind: 'exact', value };
    }
    return { kind: 'exact', value: width };
  }
  if (minWidth === undefined) return proposal;
  if (proposal.kind === 'range') {
    const min = Math.min(Math.max(minWidth, proposal.min), proposal.max ?? minWidth);
    return { kind: 'range', min, ...(proposal.max === undefined ? {} : { max: proposal.max }) };
  }
  return { kind: 'range', min: minWidth };
};

const blockProposal = (source: IRBlock, proposal: LayoutProposal): LayoutProposal => ({
  x: blockAxisProposal(proposal.x, source.width, source.minWidth),
  y: proposal.y,
});

/** 创建 Block 的 layout-aware compile callback */
export const createCompileBlock =
  (options: ResolvedGraphDefinitionOptions) =>
  (source: IRBlock, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
    const block = resolveBlock(source, options);
    const surface = requiredLayoutProbe(
      context,
      { child: lowerBlockSurface(block), occurrence: 0 },
      blockProposal(source, context.proposal),
    );
    return {
      allocationBounds: surface.allocationBounds,
      children: [context.replay(surface)],
    };
  };

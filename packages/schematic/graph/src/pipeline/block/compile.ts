import type {
  LayoutAxisProposal,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
  LayoutProposal,
} from '@retikz/core';

import { requiredLayoutProbe } from '@retikz/layout/compose';

import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { CanonicalBlock } from '../../resolve';
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

const blockProposal = (block: CanonicalBlock, proposal: LayoutProposal): LayoutProposal => ({
  x: blockAxisProposal(proposal.x, block.source.width, block.minWidth),
  y: proposal.y,
});

/** 创建 Block 的 layout-aware compile callback */
export const createCompileBlock =
  (options: ResolvedGraphDefinitionOptions) =>
  (source: IRBlock, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
    const block = resolveBlock(source, options, context.theme);
    const proposal = blockProposal(block, context.proposal);
    const measuredSurface = requiredLayoutProbe(context, { child: lowerBlockSurface(block), occurrence: 0 }, proposal);
    // range 先保留内容自然增长，再把已选定的最终宽度作为 exact cross 传播到嵌套 stretch 布局
    const surface =
      proposal.x.kind === 'exact'
        ? measuredSurface
        : requiredLayoutProbe(
            context,
            { child: lowerBlockSurface(block), occurrence: 0 },
            { ...proposal, x: { kind: 'exact', value: measuredSurface.slotSize.width } },
          );
    return {
      allocationBounds: surface.allocationBounds,
      children: [context.replay(surface)],
    };
  };

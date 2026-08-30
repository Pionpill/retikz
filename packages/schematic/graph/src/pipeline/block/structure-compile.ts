import type { LayoutCompositeCompileContext, LayoutCompositeCompileResult } from '@retikz/core';

import { requiredLayoutProbe } from '@retikz/layout/compose';

import type { IRBlockHeader, IRBlockRow, IRBlockSection } from '../../schemas';

import { lowerBlockHeaderLayout, lowerBlockRowSurface, lowerBlockSectionSurface } from './structure-lower';

const replayStructureChild = (
  child: Parameters<LayoutCompositeCompileContext['layoutChild']>[0],
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult => {
  const result = requiredLayoutProbe(context, { child, occurrence: 0 }, context.proposal);
  return { allocationBounds: result.allocationBounds, children: [context.replay(result)] };
};

/** 编译独立 Block Header composite */
export const compileBlockHeader = (
  source: IRBlockHeader,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult => replayStructureChild(lowerBlockHeaderLayout(source), context);

/** 编译独立 Block Section composite */
export const compileBlockSection = (
  source: IRBlockSection,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult => replayStructureChild(lowerBlockSectionSurface(source), context);

/** 编译独立 Block Row composite */
export const compileBlockRow = (
  source: IRBlockRow,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult => replayStructureChild(lowerBlockRowSurface(source), context);

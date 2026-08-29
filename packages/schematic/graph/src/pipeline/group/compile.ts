import type { LayoutCompositeCompileContext, LayoutCompositeCompileResult } from '@retikz/core';

import { requiredLayoutProbe } from '@retikz/layout/compose';

import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGroup } from '../../schemas';

import { resolveGroup } from '../../resolve';
import { groupScopeProps, lowerGroupLabelHost, lowerGroupSurface } from './lower';

/** 创建 Group 的 layout-aware compile callback */
export const createCompileGroup =
  (options: ResolvedGraphDefinitionOptions) =>
  (source: IRGroup, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
    const group = resolveGroup(source, options);
    const surface = requiredLayoutProbe(context, { child: lowerGroupSurface(group), occurrence: 0 }, context.proposal);
    const { width, height } = surface.slotSize;
    const host = lowerGroupLabelHost(source, width, height);
    return {
      allocationBounds: { x: 0, y: 0, width, height },
      children: [
        context.scope(groupScopeProps(source), [
          context.replay(surface),
          context.scope({ resetStyle: ['node'] }, [host]),
        ]),
      ],
    };
  };

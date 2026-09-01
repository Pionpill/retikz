import type { LayoutCompositeCompileContext, LayoutCompositeCompileResult } from '@retikz/core';

import { requiredLayoutProbe } from '@retikz/layout/compose';

import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGroup } from '../../schemas';

import { resolveGroup } from '../../resolve';
import { groupScopeProps, lowerGroupLabelHost } from './lower';
import { composeGroupShell } from './shell';

/** 创建 Group 的 layout-aware compile callback */
export const createCompileGroup =
  (options: ResolvedGraphDefinitionOptions) =>
  (source: IRGroup, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
    const group = resolveGroup(source, options, context.theme);
    const shell = composeGroupShell(group, context);
    const surface = requiredLayoutProbe(context, { child: shell.surface, occurrence: 0 }, context.proposal);
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

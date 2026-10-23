import type { CompositeCompileContext, CompositeCompileResult } from '@retikz/core';
import { requiredLayoutProbe } from '@retikz/layout/compose';

import type { ResolvedGraphDefinitionOptions } from '../../providers';
import { resolveGroup } from '../../resolve';
import type { IRGroup } from '../../schemas';
import { groupScopeProps, lowerGroupLabelHost } from './lower';
import { composeGroupShell } from './shell';

/** 创建 Group 的 layout-aware compile callback */
export const createCompileGroup =
  (options: ResolvedGraphDefinitionOptions) =>
  (source: IRGroup, context: CompositeCompileContext): CompositeCompileResult => {
    const group = resolveGroup(source, options, context.theme);
    const shell = composeGroupShell(group, context);
    const surface = requiredLayoutProbe(context, { child: shell.surface, occurrence: 0 }, context.proposal);
    const { width, height } = surface.slotSize;
    const host = lowerGroupLabelHost(source, width, height);

    return {
      allocationBounds: { x: 0, y: 0, width, height },
      children: [
        context.createScope(groupScopeProps(source), [
          context.replay(surface),
          context.createScope(
            {
              defaults: { reset: ['node'] },
            },
            [host],
          ),
        ]),
      ],
    };
  };

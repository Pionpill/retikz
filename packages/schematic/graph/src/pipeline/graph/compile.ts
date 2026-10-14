import type { CompositeCompileContext, CompositeCompileResult } from '@retikz/core';

import type { ResolvedGraphDefinitionOptions } from '../../providers';
import { resolveGraph } from '../../resolve';
import type { IRGraph } from '../../schemas';
import { graphScopeProps } from './lower';

/** 创建把 Graph context 投影结果放进唯一 Core Scope 的 layout-aware compile callback */
export const createCompileGraph =
  (options: ResolvedGraphDefinitionOptions) =>
  (source: IRGraph, context: CompositeCompileContext): CompositeCompileResult => ({
    children: [context.scope(graphScopeProps(source), resolveGraph(source, options, context.theme))],
  });

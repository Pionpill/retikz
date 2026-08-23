import type { LayoutCompositeCompileContext, LayoutCompositeCompileResult } from '@retikz/core';

import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGraph } from '../../schemas';

import { resolveGraph } from '../../resolve';
import { graphScopeProps } from './lower';

/** 创建把 Graph context 投影结果放进唯一 Core Scope 的 layout-aware compile callback */
export const createCompileGraph =
  (options: ResolvedGraphDefinitionOptions) =>
  (source: IRGraph, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => ({
    children: [context.scope(graphScopeProps(source), resolveGraph(source, options))],
  });

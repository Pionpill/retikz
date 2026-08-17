import type { ResolvedTheme } from '@retikz/core';
import type { z } from 'zod';

import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { GraphEntityThemeTokenLayer } from '../../resolve';
import type { GraphPresentationSchema } from './schema';

/** Graph presentation lowering 的完整 owner-local context */
export type GraphPresentationLowerContext = ResolvedGraphDefinitionOptions &
  Readonly<{
    theme: ResolvedTheme;
    inheritedVariant?: string;
    tokenLayers: ReadonlyArray<GraphEntityThemeTokenLayer>;
  }>;

/** Graph lowering 生成并在 Core Theme Scope 内消费的私有中间节点 */
export type IRGraphPresentation = z.infer<typeof GraphPresentationSchema>;

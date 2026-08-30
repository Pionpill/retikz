import type { LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRBlockHeader, IRBlockRow, IRBlockSection } from '../../schemas';

import { BlockHeaderSchema, BlockRowSchema, BlockSectionSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { compileBlockHeader, compileBlockRow, compileBlockSection } from './structure-compile';

/** Block Header 的独立 Core layout-aware composite definition */
export const BlockHeaderDefinition: LayoutCompositeDefinition<
  IRBlockHeader,
  typeof GRAPH_NAMESPACE,
  typeof GraphType.BlockHeader
> = defineComposite({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.BlockHeader,
  schema: BlockHeaderSchema,
  compile: compileBlockHeader,
});

/** Block Section 的独立 Core layout-aware composite definition */
export const BlockSectionDefinition: LayoutCompositeDefinition<
  IRBlockSection,
  typeof GRAPH_NAMESPACE,
  typeof GraphType.BlockSection
> = defineComposite({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.BlockSection,
  schema: BlockSectionSchema,
  compile: compileBlockSection,
});

/** Block Row 的独立 Core layout-aware composite definition */
export const BlockRowDefinition: LayoutCompositeDefinition<
  IRBlockRow,
  typeof GRAPH_NAMESPACE,
  typeof GraphType.BlockRow
> = defineComposite({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.BlockRow,
  schema: BlockRowSchema,
  compile: compileBlockRow,
});

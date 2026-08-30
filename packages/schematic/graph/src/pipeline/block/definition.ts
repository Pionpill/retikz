import type { LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRBlock } from '../../schemas';

import { resolveGraphDefinitionOptions } from '../../providers';
import { BlockSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { createCompileBlock } from './compile';

/** 用已解析 registries 创建 Block Composite Definition */
export const createBlockDefinitionFromOptions = (
  options: ResolvedGraphDefinitionOptions,
): LayoutCompositeDefinition<IRBlock, typeof GRAPH_NAMESPACE, typeof GraphType.Block> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Block,
    schema: BlockSchema,
    compile: createCompileBlock(options),
  });

/** 创建使用指定 registries 的 Block Composite Definition */
export const createBlockDefinition = (
  options: GraphDefinitionOptions = {},
): LayoutCompositeDefinition<IRBlock, typeof GRAPH_NAMESPACE, typeof GraphType.Block> =>
  createBlockDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 registries 的默认 Block Composite Definition */
export const BlockDefinition: LayoutCompositeDefinition<IRBlock, typeof GRAPH_NAMESPACE, typeof GraphType.Block> =
  createBlockDefinition();

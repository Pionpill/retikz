import type { LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGroup } from '../../schemas';

import { resolveGraphDefinitionOptions } from '../../providers';
import { GroupSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { createCompileGroup } from './compile';

/** 用已解析 registries 创建 Group Composite Definition */
export const createGroupDefinitionFromOptions = (
  options: ResolvedGraphDefinitionOptions,
): LayoutCompositeDefinition<IRGroup, typeof GRAPH_NAMESPACE, typeof GraphType.Group> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Group,
    schema: GroupSchema,
    compile: createCompileGroup(options),
  });

/** 创建使用指定 registries 的 Group Composite Definition */
export const createGroupDefinition = (
  options: GraphDefinitionOptions = {},
): LayoutCompositeDefinition<IRGroup, typeof GRAPH_NAMESPACE, typeof GraphType.Group> =>
  createGroupDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 registries 的默认 Group Composite Definition */
export const GroupDefinition: LayoutCompositeDefinition<IRGroup, typeof GRAPH_NAMESPACE, typeof GraphType.Group> =
  createGroupDefinition();

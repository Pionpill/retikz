import type { CompositeCoreProviderKey, CoreDependencyProvider, IRChild, LayoutCompositeDefinition } from '@retikz/core';
import type { BoundsRect } from '@retikz/math';
import type { output as ZodOutput } from 'zod';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { LayoutArtifactRectSchema } from '@retikz/layout';
import { literal } from 'zod';

import { GRAPH_NAMESPACE } from '../../shared';

const GROUP_BODY_ALLOCATION_TYPE = 'group-body-allocation' as const;

const GroupBodyAllocationSchema = CompositeBaseSchema.extend({
  namespace: literal(GRAPH_NAMESPACE),
  type: literal(GROUP_BODY_ALLOCATION_TYPE),
  bounds: LayoutArtifactRectSchema,
});

type IRGroupBodyAllocation = ZodOutput<typeof GroupBodyAllocationSchema>;

const compileGroupBodyAllocation = (source: IRGroupBodyAllocation) => ({
  allocationBounds: source.bounds,
  children: [],
});

export const GroupBodyAllocationDefinition: LayoutCompositeDefinition<
  IRGroupBodyAllocation,
  typeof GRAPH_NAMESPACE,
  typeof GROUP_BODY_ALLOCATION_TYPE
> = defineComposite({
  namespace: GRAPH_NAMESPACE,
  type: GROUP_BODY_ALLOCATION_TYPE,
  schema: GroupBodyAllocationSchema,
  compile: compileGroupBodyAllocation,
});

export const GroupBodyAllocationProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GROUP_BODY_ALLOCATION_TYPE,
});

export const GroupBodyAllocationProvider: CoreDependencyProvider = Object.freeze({
  key: GroupBodyAllocationProviderKey,
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => GroupBodyAllocationDefinition,
});

/** 创建无绘制、无 identity 且只声明精确 Group body allocation 的 compile child */
export const createGroupBodyAllocation = (bounds: Readonly<BoundsRect>): IRChild =>
  GroupBodyAllocationSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GROUP_BODY_ALLOCATION_TYPE,
    bounds,
  });

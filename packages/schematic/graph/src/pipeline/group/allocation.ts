import type {
  CompositeCoreProviderKey,
  CoreDependencyProvider,
  IRChild,
  LayoutCompositeDefinition,
} from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { LayoutArtifactRectSchema } from '@retikz/layout';
import type { BoundsRect } from '@retikz/math';
import type { output as ZodOutput } from 'zod';
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

/** 只声明 Group 正文分配边界、不生成绘制子元素的内部组件定义 */
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

/** 定位仅贡献 Group 正文分配边界的内部组件能力 */
export const GroupBodyAllocationProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GROUP_BODY_ALLOCATION_TYPE,
});

/** 为 Group 提供不依赖其它 provider 的正文分配边界组件 */
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

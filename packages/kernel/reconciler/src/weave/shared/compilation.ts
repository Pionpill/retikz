import type { ScenePrimitive } from '@retikz/core';

import { collectContributionResources } from '../../compile/execution';
import type { CompileReferenceRead, CompileRuntime } from '../../compile/runtime';
import { importSceneResources } from '../../compile/shared';
import type { WeaveCacheMetadata } from './types';

/** 部分复用未重新查询的引用仍属于本次计算依赖 */
export const retainWeaveReads = (
  reads: Array<CompileReferenceRead>,
  previous: ReadonlyArray<CompileReferenceRead>,
): void => {
  for (const read of previous)
    if (!reads.some(current => current.name === read.name && current.kind === read.kind)) reads.push(read);
};

/** 导入已确认有效的缓存资源，局部复用时只恢复实际消费的片段 */
export const restoreWeaveResources = (
  runtime: CompileRuntime,
  cache: WeaveCacheMetadata,
  primitives?: Array<ScenePrimitive>,
): void => {
  const resources =
    primitives === undefined ? cache.resources : collectContributionResources(primitives, [...cache.resources]);
  importSceneResources(resources, runtime.state.workspace.paintRegistry, runtime.state.workspace.clipRegistry);
};

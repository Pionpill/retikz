import type { ScenePrimitive, SceneResources } from '@retikz/core';

import type { CompileRuntime } from '../../compile';
import { importSceneResources } from '../../compile';
import { collectContributionResources } from './contribution';
import type { WeaveReferenceRead } from './reference';

/** 部分复用未重新查询的引用仍属于本次计算依赖 */
export const retainWeaveReads = (
  reads: Array<WeaveReferenceRead>,
  previous: ReadonlyArray<WeaveReferenceRead>,
): void => {
  for (const read of previous)
    if (
      !reads.some(
        current => current.name === read.name && current.kind === read.kind && current.readiness === read.readiness,
      )
    )
      reads.push(read);
};

/** 导入已确认有效的缓存资源，局部复用时只恢复实际消费的片段 */
export const restoreWeaveResources = (
  runtime: CompileRuntime,
  resources: SceneResources,
  primitives?: Array<ScenePrimitive>,
): void => {
  const retainedResources = primitives === undefined ? resources : collectContributionResources(primitives, resources);
  importSceneResources(retainedResources, runtime.state.workspace.paintRegistry, runtime.state.workspace.clipRegistry);
};

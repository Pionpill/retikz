import type { CompileProvenance, Scene } from '@retikz/core';

import { CORE_SOURCE_KEY } from '../constants';
import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../error';
import type { RuntimeScene, RuntimeScenePrimitive, SceneRuntimeNode, SceneRuntimeSnapshot } from '../scene';
import { createPrimitiveIdentityIndex } from './identity';
import { createSceneIdentity } from './identity-value';
import type { SceneRevision } from './identity-value';

/**
 * 递归冻结 Computation 新创建且尚未对外暴露的 plain output
 * @template T 递归冻结且原样返回的计算输出类型
 */
const freezeComputationOutput = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    value.forEach(item => freezeComputationOutput(item));
  } else {
    Object.values(value).forEach(item => freezeComputationOutput(item));
  }

  return Object.isFrozen(value) ? value : Object.freeze(value);
};

const rootIdentity = createSceneIdentity(CORE_SOURCE_KEY, ['root']);

/** 为 full mount 创建 primitive occurrence topology */
const createFullTopology = (
  primitives: ReadonlyArray<RuntimeScenePrimitive>,
  metadata: ReturnType<typeof createPrimitiveIdentityIndex>,
): ReadonlyArray<SceneRuntimeNode> => {
  const topology: Array<SceneRuntimeNode> = [];

  const visit = (items: ReadonlyArray<RuntimeScenePrimitive>, parent: SceneRuntimeNode['parent']): void => {
    items.forEach((primitive, order) => {
      const record = metadata.get(primitive);
      if (record === undefined) {
        throw new RetikzReconcilerError(
          RetikzReconcilerErrorCode.Compile,
          'createFullSceneRuntimeSnapshot: missing primitive identity',
        );
      }

      topology.push(
        Object.freeze({
          identity: record.identity,
          semanticOwner: record.semanticOwner,
          parent,
          order,
          primitivePath: record.primitivePath,
          ...(primitive.id === undefined ? {} : { publicId: primitive.id }),
        }),
      );
      if (primitive.type === 'group') visit(primitive.children, record.identity);
    });
  };

  visit(primitives, rootIdentity);

  return Object.freeze(topology);
};

/** 把 full compile Scene 规范化为 Runtime snapshot */
export const createFullSceneRuntimeSnapshot = (
  scene: Scene,
  revision: SceneRevision,
  provenance: CompileProvenance,
): SceneRuntimeSnapshot => {
  const runtimeScene = freezeComputationOutput({
    ...scene,
    primitives: scene.primitives,
    resources: scene.resources ?? [],
    animations: scene.animations ?? [],
  }) as RuntimeScene;
  return Object.freeze({
    revision,
    scene: runtimeScene,
    root: rootIdentity,
    topology: createFullTopology(
      runtimeScene.primitives,
      createPrimitiveIdentityIndex(runtimeScene.primitives, provenance, revision),
    ),
  });
};

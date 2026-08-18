import type { RuntimeRevision } from '@retikz/runtime';

import { createRuntimeIdentity } from '@retikz/runtime';

import type {
  RuntimeScene,
  RuntimeScenePrimitive,
  Scene,
  SceneRuntimeNode,
  SceneRuntimeSnapshot,
} from '../../contract';
import type { RuntimePrimitiveMetadataTable } from '../orchestration';

import { CORE_OWNER_KEY } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/** 递归冻结 Program 新创建且尚未对外暴露的 plain output */
export const freezeProgramOutput = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    value.forEach(item => freezeProgramOutput(item));
  } else {
    Object.values(value).forEach(item => freezeProgramOutput(item));
  }
  return Object.isFrozen(value) ? value : Object.freeze(value);
};

const rootIdentity = createRuntimeIdentity(CORE_OWNER_KEY, ['root']);

/** 为 full mount 创建 primitive occurrence topology */
const createFullTopology = (
  primitives: ReadonlyArray<RuntimeScenePrimitive>,
  metadata: RuntimePrimitiveMetadataTable,
): ReadonlyArray<SceneRuntimeNode> => {
  const topology: Array<SceneRuntimeNode> = [];
  const visit = (
    items: ReadonlyArray<RuntimeScenePrimitive>,
    parent: SceneRuntimeNode['parent'],
    parentPath: ReadonlyArray<number>,
  ): void => {
    items.forEach((primitive, order) => {
      const primitivePath = Object.freeze([...parentPath, order]);
      const record = metadata.get(primitive as Scene['primitives'][number]);
      if (record === undefined) {
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          `createFullSceneRuntimeSnapshot: missing primitive identity at ${primitivePath.join('.')}`,
        );
      }
      topology.push(
        Object.freeze({
          identity: record.identity,
          semanticOwner: record.semanticOwner,
          parent,
          order,
          primitivePath,
          ...(primitive.id === undefined ? {} : { publicId: primitive.id }),
        }),
      );
      if (primitive.type === 'group') visit(primitive.children, record.identity, primitivePath);
    });
  };
  visit(primitives, rootIdentity, []);
  return Object.freeze(topology);
};

/** 把 full compile Scene 规范化为 Runtime Session snapshot */
export const createFullSceneRuntimeSnapshot = (
  scene: Scene,
  revision: RuntimeRevision,
  metadata: RuntimePrimitiveMetadataTable,
): SceneRuntimeSnapshot => {
  const runtimeScene = freezeProgramOutput({
    ...scene,
    primitives: scene.primitives,
    resources: scene.resources ?? [],
    animations: scene.animations ?? [],
  }) as RuntimeScene;
  return Object.freeze({
    revision,
    scene: runtimeScene,
    root: rootIdentity,
    topology: createFullTopology(runtimeScene.primitives, metadata),
  });
};

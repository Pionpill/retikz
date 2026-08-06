import type { RuntimeRevision, RuntimeTraceReporter } from '@retikz/runtime';

import {
  createRuntimeIdentity,
  PerformanceTracePhase,
  PerformanceTraceUnit,
  runtimeIdentityEquals,
} from '@retikz/runtime';

import type {
  AnyCompositeDefinition,
  RuntimeScenePrimitive,
  ScenePatchOperation,
  SceneRuntimeNode,
  SceneRuntimeSubtree,
} from '../../contract';
import type { IRNode, IRScene } from '../../schemas';
import type { CoreSnapshotIndexRead } from './diff';
import type { CoreProgramOptions } from './public';
import type { CoreProgramArtifactInput, CoreProgramRead } from './types';

import { CORE_OWNER_KEY } from '../../contract';
import { jsonStructuralEquals } from '../../shared/json';
import { compileCoreSnapshot } from '../compile';
import { createFullSceneRuntimeSnapshot, freezeProgramOutput } from './snapshot';

/** 单个 root Node 样式更新产生的 private incremental candidate */
export type CoreRootNodeStyleCandidate<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  /** 交给 Runtime capture 的完整 candidate artifact */
  artifact: CoreProgramArtifactInput<TComposites>;
  /** 复用的 committed root child 数 */
  reused: number;
  /** 规范化 Scene Patch operation 数 */
  operationCount: number;
}>;

/** 读取只含一个根 Node 的稳定 id */
const stableRootNodeId = (child: IRScene['children'][number]): string | undefined =>
  !('namespace' in child) && child.type === 'node' && typeof child.id === 'string' && child.id.length > 0
    ? child.id
    : undefined;

/** 判断两个 Node 是否只发生无资源 fill string 变化 */
const isFillOnlyUpdate = (previous: Readonly<IRNode>, next: Readonly<IRNode>): boolean => {
  const previousSolidFill = previous.fill === undefined || typeof previous.fill === 'string';
  const nextSolidFill = next.fill === undefined || typeof next.fill === 'string';
  if (!previousSolidFill || !nextSolidFill || previous.fill === next.fill) return false;
  const { fill: previousFill, ...previousRest } = previous;
  const { fill: nextFill, ...nextRest } = next;
  void previousFill;
  void nextFill;
  return jsonStructuralEquals(previousRest, nextRest);
};

/** 创建单 primitive update 使用的相对 subtree */
const createPrimitiveSubtree = (
  primitive: RuntimeScenePrimitive,
  rootTopology: SceneRuntimeNode,
  topology: ReadonlyArray<SceneRuntimeNode>,
): SceneRuntimeSubtree | undefined => {
  if (rootTopology.primitivePath.length !== 1) return undefined;
  const rootOrder = rootTopology.primitivePath[0];
  const relativeTopology = topology
    .filter(node => node.primitivePath[0] === rootOrder)
    .map(node =>
      Object.freeze({
        identity: node.identity,
        semanticOwner: node.semanticOwner,
        ...(runtimeIdentityEquals(node.identity, rootTopology.identity) ? {} : { parent: node.parent }),
        order: runtimeIdentityEquals(node.identity, rootTopology.identity) ? 0 : node.order,
        primitivePath: Object.freeze(node.primitivePath.slice(1)),
        ...(node.publicId === undefined ? {} : { publicId: node.publicId }),
      }),
    );
  if (
    relativeTopology.length === 0 ||
    relativeTopology[0]?.primitivePath.length !== 0 ||
    !runtimeIdentityEquals(relativeTopology[0].identity, rootTopology.identity)
  ) {
    return undefined;
  }
  return Object.freeze({
    root: rootTopology.identity,
    primitive,
    topology: Object.freeze(relativeTopology),
  });
};

/**
 * 尝试复用 committed root Node contribution，只重编一个 fill string 变化的稳定 Node
 * @description 任何引用、资源、artifact、diagnostic、结构或多 owner 变化都会返回 undefined 交由 full fallback
 */
export const tryCompileRootNodeStyleUpdate = <
  const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly [],
>(
  previous: CoreProgramRead<TComposites>,
  nextSource: Readonly<IRScene>,
  nextIndex: CoreSnapshotIndexRead,
  options: CoreProgramOptions<TComposites>,
  baseRevision: RuntimeRevision,
  candidateRevision: RuntimeRevision,
): CoreRootNodeStyleCandidate<TComposites> | undefined => {
  if (options.shapes !== undefined) return undefined;
  const { children: previousChildren, ...previousRoot } = previous.state.source;
  const { children: nextChildren, ...nextRoot } = nextSource;
  if (!jsonStructuralEquals(previousRoot, nextRoot) || previousChildren.length !== nextChildren.length)
    return undefined;
  if (
    previous.output.diagnostics.length > 0 ||
    previous.output.result.artifacts.length > 0 ||
    previous.snapshot.scene.resources.length > 0
  ) {
    return undefined;
  }

  const seenIds = new Set<string>();
  let changedIndex = -1;
  for (let index = 0; index < nextChildren.length; index += 1) {
    const previousChild = previousChildren[index];
    const nextChild = nextChildren[index];
    if (
      'namespace' in previousChild ||
      previousChild.type !== 'node' ||
      'namespace' in nextChild ||
      nextChild.type !== 'node' ||
      !Array.isArray(previousChild.position) ||
      !Array.isArray(nextChild.position)
    ) {
      return undefined;
    }
    const previousId = stableRootNodeId(previousChild);
    const nextId = stableRootNodeId(nextChild);
    if (previousId === undefined || nextId !== previousId || seenIds.has(nextId)) return undefined;
    seenIds.add(nextId);
    if (jsonStructuralEquals(previousChild, nextChild)) continue;
    if (changedIndex >= 0 || !isFillOnlyUpdate(previousChild, nextChild)) {
      return undefined;
    }
    changedIndex = index;
  }
  if (changedIndex < 0) return undefined;
  const changedNode = nextChildren[changedIndex];
  const changedId = stableRootNodeId(changedNode);
  if (changedId === undefined) return undefined;
  let changedVisited = 0;
  const counter: RuntimeTraceReporter<'@retikz/core'> = Object.freeze({
    owner: '@retikz/core' as const,
    report: record => {
      if (record.phase === PerformanceTracePhase.Compile && record.unit === PerformanceTraceUnit.IrChild) {
        changedVisited = record.visited;
      }
    },
    diagnostics: () => Object.freeze([]),
  });
  const isolated = compileCoreSnapshot(
    { ...nextSource, children: [changedNode] },
    { ...options, onWarn: undefined, trace: counter },
    { candidateRevision },
  );
  if (
    changedVisited !== 1 ||
    isolated.primitiveMetadata === undefined ||
    isolated.diagnostics.length > 0 ||
    isolated.result.artifacts.length > 0 ||
    (isolated.result.scene.resources?.length ?? 0) > 0
  ) {
    return undefined;
  }
  freezeProgramOutput(isolated.result);
  const isolatedSnapshot = createFullSceneRuntimeSnapshot(
    isolated.result.scene,
    candidateRevision,
    isolated.primitiveMetadata,
  );
  const changedOwner = createRuntimeIdentity(CORE_OWNER_KEY, ['root', 'node', changedId]);
  const previousRootTopology = previous.snapshot.topology.filter(
    node => node.primitivePath.length === 1 && runtimeIdentityEquals(node.semanticOwner, changedOwner),
  );
  const isolatedRootTopology = isolatedSnapshot.topology.filter(
    node => node.primitivePath.length === 1 && runtimeIdentityEquals(node.semanticOwner, changedOwner),
  );
  if (previousRootTopology.length === 0 || previousRootTopology.length !== isolatedRootTopology.length) {
    return undefined;
  }

  const isolatedByIdentity = new Map(
    isolatedRootTopology.map(topology => [JSON.stringify(topology.identity.path), topology] as const),
  );
  const isolatedPrimitiveByIdentity = new Map<string, RuntimeScenePrimitive>();
  for (const topology of isolatedRootTopology) {
    const primitive = isolatedSnapshot.scene.primitives[topology.order];
    isolatedPrimitiveByIdentity.set(JSON.stringify(topology.identity.path), primitive);
  }
  if (
    previousRootTopology.some(topology => !isolatedByIdentity.has(JSON.stringify(topology.identity.path))) ||
    isolatedPrimitiveByIdentity.size !== previousRootTopology.length
  ) {
    return undefined;
  }

  const nextPrimitives = [...previous.snapshot.scene.primitives];
  const operations: Array<ScenePatchOperation> = [];
  for (const previousTopology of previousRootTopology) {
    const identityKey = JSON.stringify(previousTopology.identity.path);
    const nextPrimitive = isolatedPrimitiveByIdentity.get(identityKey);
    const nextTopology = isolatedByIdentity.get(identityKey);
    const previousPrimitive = previous.snapshot.scene.primitives[previousTopology.order];
    if (nextPrimitive === undefined || nextTopology === undefined) return undefined;
    nextPrimitives[previousTopology.order] = nextPrimitive;
    if (jsonStructuralEquals(previousPrimitive, nextPrimitive)) continue;
    const subtree = createPrimitiveSubtree(nextPrimitive, nextTopology, isolatedSnapshot.topology);
    if (subtree === undefined) return undefined;
    operations.push(Object.freeze({ kind: 'update', identity: previousTopology.identity, subtree }));
  }
  if (operations.length === 0) return undefined;

  const runtimePrimitives = freezeProgramOutput(nextPrimitives);
  const outputPrimitives = runtimePrimitives as typeof previous.output.result.scene.primitives;
  const result = freezeProgramOutput({
    ...previous.output.result,
    scene: { ...previous.output.result.scene, primitives: outputPrimitives },
  }) as typeof previous.output.result;
  const snapshot = Object.freeze({
    revision: candidateRevision,
    scene: freezeProgramOutput({ ...previous.snapshot.scene, primitives: runtimePrimitives }),
    root: previous.snapshot.root,
    topology: previous.snapshot.topology,
  });
  const patch = Object.freeze({
    baseRevision,
    nextRevision: candidateRevision,
    operations: Object.freeze(operations),
  });
  const publicRead = Object.freeze({
    output: Object.freeze({
      result,
      diagnostics: previous.output.diagnostics,
      observerOutputs: previous.output.observerOutputs,
    }),
    snapshot,
    patch,
  });
  return Object.freeze({
    artifact: Object.freeze({
      publicRead,
      state: Object.freeze({ source: nextSource, index: nextIndex }),
    }),
    reused: nextChildren.length - 1,
    operationCount: operations.length,
  });
};

import type {
  RuntimeScene,
  RuntimeScenePrimitive,
  ScenePatch,
  ScenePatchOperation,
  SceneRuntimeNode,
  SceneRuntimeSnapshot,
  SceneRuntimeSubtree,
  SceneRuntimeSubtreeNode,
} from '@retikz/core';
import type { RuntimeIdentity } from '@retikz/runtime';

import { createRuntimeIdentityLookup, runtimeIdentityEquals } from '@retikz/runtime';

import type { RuntimeIdentityMap } from './shared';

import { isRetainedRenderError, RetainedRenderError, RetainedRenderErrorCode } from './error';
import { createRuntimeIdentityMap, runtimeStructuralEquals } from './shared';

type MutableSceneNode = {
  identity: RuntimeIdentity;
  semanticOwner: RuntimeIdentity;
  publicId?: string;
  basePrimitive: Record<string, unknown>;
  parent: MutableSceneNode | MutableSceneRoot;
  previous?: MutableSceneNode;
  next?: MutableSceneNode;
  firstChild?: MutableSceneNode;
  lastChild?: MutableSceneNode;
};

type MutableSceneRoot = {
  identity: RuntimeIdentity;
  firstChild?: MutableSceneNode;
  lastChild?: MutableSceneNode;
};

const isMutableSceneNode = (value: MutableSceneNode | MutableSceneRoot): value is MutableSceneNode =>
  'basePrimitive' in value;

const topologyError = (cause: unknown): never => {
  throw new RetainedRenderError({ code: RetainedRenderErrorCode.SceneTopologyInvalid, cause });
};

const patchError = (cause: unknown): never => {
  throw new RetainedRenderError({ code: RetainedRenderErrorCode.ScenePatchInvalid, cause });
};

const mismatchError = (cause: unknown): never => {
  throw new RetainedRenderError({ code: RetainedRenderErrorCode.ScenePatchSnapshotMismatch, cause });
};

const revisionError = (cause: unknown): never => {
  throw new RetainedRenderError({ code: RetainedRenderErrorCode.ScenePatchRevisionMismatch, cause });
};

const isDenseArray = (value: unknown, predicate: (item: unknown) => boolean): value is ReadonlyArray<unknown> => {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!(index in value) || !predicate(value[index])) return false;
  }
  return true;
};

const isRuntimeIdentity = (value: unknown): value is RuntimeIdentity => {
  if (typeof value !== 'object' || value === null) return false;
  const owner = Reflect.get(value, 'owner');
  const path = Reflect.get(value, 'path');
  if (
    typeof owner !== 'string' ||
    owner.length === 0 ||
    !isDenseArray(path, segment => typeof segment === 'string' && segment.length > 0) ||
    path.length === 0
  ) {
    return false;
  }
  try {
    return runtimeIdentityEquals(value as RuntimeIdentity, value as RuntimeIdentity);
  } catch {
    return false;
  }
};

const validateUniqueIdentities = (identities: ReadonlyArray<RuntimeIdentity>): void => {
  const byOwner = new Map<string, Array<RuntimeIdentity>>();
  for (const identity of identities) {
    const values = byOwner.get(identity.owner) ?? [];
    values.push(identity);
    byOwner.set(identity.owner, values);
  }
  for (const [owner, values] of byOwner) createRuntimeIdentityLookup(owner, values);
};

const primitiveKinds = new Set(['rect', 'ellipse', 'text', 'path', 'group']);

const validatePrimitiveArray: (
  primitives: unknown,
) => asserts primitives is ReadonlyArray<RuntimeScenePrimitive> = primitives => {
  if (!Array.isArray(primitives)) {
    return topologyError({ reason: 'invalid-primitive-array', primitives });
  }
  for (let index = 0; index < primitives.length; index += 1) {
    const primitive: unknown = primitives[index];
    if (!(index in primitives) || typeof primitive !== 'object' || primitive === null) {
      return topologyError({ reason: 'invalid-primitive-array', primitives });
    }
    const kind = Reflect.get(primitive, 'type');
    if (typeof kind !== 'string' || !primitiveKinds.has(kind)) {
      return topologyError({ reason: 'invalid-primitive-kind', primitive });
    }
    if (kind === 'group') validatePrimitiveArray(Reflect.get(primitive, 'children'));
  }
};

const primitiveAtPath = (
  primitives: ReadonlyArray<RuntimeScenePrimitive>,
  path: ReadonlyArray<number>,
): RuntimeScenePrimitive | undefined => {
  let current: ReadonlyArray<RuntimeScenePrimitive> = primitives;
  let primitive: RuntimeScenePrimitive | undefined;
  for (const index of path) {
    const candidate: unknown = Reflect.get(current, index);
    if (candidate === undefined) return undefined;
    primitive = candidate as RuntimeScenePrimitive;
    current = primitive.type === 'group' ? primitive.children : [];
  }
  return primitive;
};

const primitivePaths = (
  primitives: ReadonlyArray<RuntimeScenePrimitive>,
  prefix: ReadonlyArray<number> = [],
): Array<ReadonlyArray<number>> => {
  const paths: Array<ReadonlyArray<number>> = [];
  primitives.forEach((primitive, index) => {
    const path = [...prefix, index];
    paths.push(path);
    if (primitive.type === 'group') paths.push(...primitivePaths(primitive.children, path));
  });
  return paths;
};

const validateTopology = (
  primitives: ReadonlyArray<RuntimeScenePrimitive>,
  root: RuntimeIdentity,
  topology: ReadonlyArray<SceneRuntimeNode>,
): void => {
  if (!isRuntimeIdentity(root) || !Array.isArray(topology)) topologyError({ root, topology });
  const expectedPaths = primitivePaths(primitives);
  if (expectedPaths.length !== topology.length) topologyError({ reason: 'primitive-topology-cardinality' });
  const byPath = new Map<string, SceneRuntimeNode>();
  const identities = createRuntimeIdentityMap<true>([]);
  for (const node of topology) {
    const candidate: unknown = node;
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      !isRuntimeIdentity(node.identity) ||
      !isRuntimeIdentity(node.semanticOwner) ||
      !isRuntimeIdentity(node.parent) ||
      !Number.isSafeInteger(node.order) ||
      node.order < 0 ||
      !isDenseArray(
        node.primitivePath,
        index => typeof index === 'number' && Number.isSafeInteger(index) && index >= 0,
      ) ||
      (node.publicId !== undefined && typeof node.publicId !== 'string')
    ) {
      topologyError({ reason: 'invalid-node', node });
    }
    const path = node.primitivePath.join('.');
    if (runtimeIdentityEquals(node.identity, root) || !identities.set(node.identity, true) || byPath.has(path)) {
      topologyError({ reason: 'duplicate-node', node });
    }
    byPath.set(path, node);
  }
  validateUniqueIdentities(topology.map(node => node.identity));
  for (const path of expectedPaths) {
    const node = byPath.get(path.join('.'));
    const primitive = primitiveAtPath(primitives, path);
    if (node === undefined || primitive === undefined) return topologyError({ reason: 'missing-node', path });
    const parentPath = path.slice(0, -1);
    const parent = parentPath.length === 0 ? root : byPath.get(parentPath.join('.'))?.identity;
    if (parent === undefined || !runtimeIdentityEquals(node.parent, parent) || node.order !== path.at(-1)) {
      topologyError({ reason: 'parent-order-mismatch', node });
    }
  }
};

const validateSubtree = (subtree: SceneRuntimeSubtree): void => {
  const candidate: unknown = subtree;
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    !isRuntimeIdentity(Reflect.get(candidate, 'root')) ||
    !Array.isArray(Reflect.get(candidate, 'topology'))
  ) {
    topologyError(subtree);
  }
  validatePrimitiveArray([subtree.primitive]);
  const paths = primitivePaths([subtree.primitive]).map(path => path.slice(1));
  if (paths.length !== subtree.topology.length) topologyError({ reason: 'subtree-cardinality', subtree });
  const byPath = new Map<string, SceneRuntimeSubtreeNode>();
  const identities = createRuntimeIdentityMap<true>([]);
  for (const node of subtree.topology) {
    const nodeCandidate: unknown = node;
    if (
      typeof nodeCandidate !== 'object' ||
      nodeCandidate === null ||
      !isRuntimeIdentity(node.identity) ||
      !isRuntimeIdentity(node.semanticOwner) ||
      (node.parent !== undefined && !isRuntimeIdentity(node.parent)) ||
      !Number.isSafeInteger(node.order) ||
      node.order < 0 ||
      !isDenseArray(node.primitivePath, index => typeof index === 'number' && Number.isSafeInteger(index) && index >= 0)
    ) {
      topologyError({ reason: 'invalid-subtree-node', node });
    }
    const path = node.primitivePath.join('.');
    if (!identities.set(node.identity, true) || byPath.has(path)) {
      topologyError({ reason: 'duplicate-subtree-node', node });
    }
    byPath.set(path, node);
  }
  validateUniqueIdentities(subtree.topology.map(node => node.identity));
  for (const path of paths) {
    const node = byPath.get(path.join('.'));
    if (node === undefined) return topologyError({ reason: 'missing-subtree-node', path });
    const parentPath = path.slice(0, -1);
    const parent = path.length === 0 ? undefined : byPath.get(parentPath.join('.'))?.identity;
    if (
      (node.parent === undefined
        ? parent !== undefined
        : parent === undefined || !runtimeIdentityEquals(node.parent, parent)) ||
      node.order !== (path.length === 0 ? 0 : path.at(-1))
    ) {
      topologyError({ reason: 'subtree-parent-order-mismatch', node });
    }
  }
  const rootNode = byPath.get('');
  if (
    rootNode === undefined ||
    !runtimeIdentityEquals(rootNode.identity, subtree.root) ||
    rootNode.parent !== undefined ||
    rootNode.order !== 0
  ) {
    topologyError({ reason: 'subtree-root-mismatch', subtree });
  }
};

const clonePrimitiveBase = (primitive: RuntimeScenePrimitive): Record<string, unknown> => {
  const base = { ...(primitive as unknown as Record<string, unknown>) };
  delete base.children;
  return base;
};

type MutableSceneParent = MutableSceneNode | MutableSceneRoot;

const forEachChild = (parent: MutableSceneParent, callback: (child: MutableSceneNode, index: number) => void): void => {
  let child = parent.firstChild;
  let index = 0;
  while (child !== undefined) {
    const next = child.next;
    callback(child, index);
    child = next;
    index += 1;
  }
};

const insertNodeBefore = (
  parent: MutableSceneParent,
  node: MutableSceneNode,
  before: MutableSceneNode | undefined,
): void => {
  if (before !== undefined && before.parent !== parent) {
    return patchError({ reason: 'before-not-sibling', before: before.identity });
  }
  node.parent = parent;
  node.next = before;
  node.previous = before === undefined ? parent.lastChild : before.previous;
  if (node.previous === undefined) parent.firstChild = node;
  else node.previous.next = node;
  if (before === undefined) parent.lastChild = node;
  else before.previous = node;
};

const detach = (node: MutableSceneNode): void => {
  const { parent, previous, next } = node;
  if (previous === undefined) {
    if (parent.firstChild !== node) return patchError({ reason: 'detached-node', identity: node.identity });
    parent.firstChild = next;
  } else previous.next = next;
  if (next === undefined) {
    if (parent.lastChild !== node) return patchError({ reason: 'detached-node', identity: node.identity });
    parent.lastChild = previous;
  } else next.previous = previous;
  delete node.previous;
  delete node.next;
};

const buildMutableTree = (snapshot: SceneRuntimeSnapshot): MutableSceneRoot => {
  const root: MutableSceneRoot = { identity: snapshot.root };
  const topologyByPath = new Map(snapshot.topology.map(node => [node.primitivePath.join('.'), node]));
  const nodesByPath = new Map<string, MutableSceneNode>();
  for (const path of primitivePaths(snapshot.scene.primitives)) {
    const topology = topologyByPath.get(path.join('.'));
    const primitive = primitiveAtPath(snapshot.scene.primitives, path);
    if (topology === undefined || primitive === undefined) return topologyError({ reason: 'tree-build', path });
    const parentPath = path.slice(0, -1);
    const parent = parentPath.length === 0 ? root : nodesByPath.get(parentPath.join('.'));
    if (parent === undefined) return topologyError({ reason: 'tree-parent', path });
    const node: MutableSceneNode = {
      identity: topology.identity,
      semanticOwner: topology.semanticOwner,
      ...(topology.publicId === undefined ? {} : { publicId: topology.publicId }),
      basePrimitive: clonePrimitiveBase(primitive),
      parent,
    };
    insertNodeBefore(parent, node, undefined);
    nodesByPath.set(path.join('.'), node);
  }
  return root;
};

const buildMutableSubtree = (
  subtree: SceneRuntimeSubtree,
  parent: MutableSceneNode | MutableSceneRoot,
): MutableSceneNode => {
  const topologyByPath = new Map(subtree.topology.map(node => [node.primitivePath.join('.'), node]));
  const nodesByPath = new Map<string, MutableSceneNode>();
  let rootNode: MutableSceneNode | undefined;
  for (const path of primitivePaths([subtree.primitive]).map(value => value.slice(1))) {
    const topology = topologyByPath.get(path.join('.'));
    const primitive = path.length === 0 ? subtree.primitive : primitiveAtPath([subtree.primitive], [0, ...path]);
    if (topology === undefined || primitive === undefined) return topologyError({ reason: 'subtree-build', path });
    const nodeParent = path.length === 0 ? parent : nodesByPath.get(path.slice(0, -1).join('.'));
    if (nodeParent === undefined) return topologyError({ reason: 'subtree-build-parent', path });
    const node: MutableSceneNode = {
      identity: topology.identity,
      semanticOwner: topology.semanticOwner,
      ...(topology.publicId === undefined ? {} : { publicId: topology.publicId }),
      basePrimitive: clonePrimitiveBase(primitive),
      parent: nodeParent,
    };
    if (path.length > 0) insertNodeBefore(nodeParent, node, undefined);
    nodesByPath.set(path.join('.'), node);
    if (path.length === 0) rootNode = node;
  }
  if (rootNode === undefined) return topologyError({ reason: 'subtree-build-root' });
  return rootNode;
};

const indexMutableTree = (root: MutableSceneRoot): RuntimeIdentityMap<MutableSceneNode> => {
  const entries: Array<readonly [RuntimeIdentity, MutableSceneNode]> = [];
  const visit = (node: MutableSceneNode): void => {
    entries.push([node.identity, node]);
    forEachChild(node, visit);
  };
  forEachChild(root, visit);
  return createRuntimeIdentityMap(entries);
};

const addMutableSubtreeToIndex = (node: MutableSceneNode, index: RuntimeIdentityMap<MutableSceneNode>): void => {
  if (!index.set(node.identity, node)) patchError({ reason: 'subtree-identity-collision', identity: node.identity });
  forEachChild(node, child => addMutableSubtreeToIndex(child, index));
};

const removeMutableSubtreeFromIndex = (node: MutableSceneNode, index: RuntimeIdentityMap<MutableSceneNode>): void => {
  index.delete(node.identity);
  forEachChild(node, child => removeMutableSubtreeFromIndex(child, index));
};

const materializePrimitive = (node: MutableSceneNode): RuntimeScenePrimitive => {
  if (node.basePrimitive.type !== 'group') return node.basePrimitive as unknown as RuntimeScenePrimitive;
  const children: Array<RuntimeScenePrimitive> = [];
  forEachChild(node, child => children.push(materializePrimitive(child)));
  return {
    ...node.basePrimitive,
    children,
  } as unknown as RuntimeScenePrimitive;
};

const materializeChildren = (parent: MutableSceneParent): Array<RuntimeScenePrimitive> => {
  const primitives: Array<RuntimeScenePrimitive> = [];
  forEachChild(parent, child => primitives.push(materializePrimitive(child)));
  return primitives;
};

const materializeTopology = (root: MutableSceneRoot): Array<SceneRuntimeNode> => {
  const result: Array<SceneRuntimeNode> = [];
  const visit = (node: MutableSceneNode, path: ReadonlyArray<number>): void => {
    result.push({
      identity: node.identity,
      semanticOwner: node.semanticOwner,
      parent: node.parent.identity,
      order: path.at(-1) ?? 0,
      primitivePath: path,
      ...(node.publicId === undefined ? {} : { publicId: node.publicId }),
    });
    forEachChild(node, (child, index) => visit(child, [...path, index]));
  };
  forEachChild(root, (node, index) => visit(node, [index]));
  return result;
};

const operationRank = (operation: ScenePatchOperation): number => {
  if (operation.kind === 'setResources') return 0;
  if (['insert', 'update', 'move'].includes(operation.kind)) return 1;
  if (operation.kind === 'setLayout') return 2;
  if (operation.kind === 'setAnimations') return 3;
  if (operation.kind === 'remove') return 4;
  return 5;
};

const operationTarget = (operation: ScenePatchOperation): RuntimeIdentity | undefined => {
  if (operation.kind === 'insert') return operation.subtree.root;
  if (operation.kind === 'update' || operation.kind === 'remove' || operation.kind === 'move')
    return operation.identity;
  return undefined;
};

const validateOperationShape = (operation: ScenePatchOperation): void => {
  const candidate: unknown = operation;
  if (typeof candidate !== 'object' || candidate === null) return patchError(operation);
  const kind = Reflect.get(candidate, 'kind');
  if (kind === 'setLayout') {
    if (typeof Reflect.get(candidate, 'layout') !== 'object' || Reflect.get(candidate, 'layout') === null) {
      return patchError(operation);
    }
    return;
  }
  if (kind === 'setResources' || kind === 'setAnimations') {
    const field = kind === 'setResources' ? 'resources' : 'animations';
    if (!isDenseArray(Reflect.get(candidate, field), () => true)) return patchError(operation);
    return;
  }
  if (kind === 'insert') {
    const parent = Reflect.get(candidate, 'parent');
    const before = Reflect.get(candidate, 'before');
    const subtree = Reflect.get(candidate, 'subtree');
    if (!isRuntimeIdentity(parent) || (before !== undefined && !isRuntimeIdentity(before))) {
      return patchError(operation);
    }
    validateSubtree(subtree as SceneRuntimeSubtree);
    return;
  }
  if (kind === 'update') {
    const identity = Reflect.get(candidate, 'identity');
    const subtree = Reflect.get(candidate, 'subtree');
    if (!isRuntimeIdentity(identity)) return patchError(operation);
    validateSubtree(subtree as SceneRuntimeSubtree);
    return;
  }
  if (kind === 'remove') {
    if (!isRuntimeIdentity(Reflect.get(candidate, 'identity'))) return patchError(operation);
    return;
  }
  if (kind === 'move') {
    const identity = Reflect.get(candidate, 'identity');
    const parent = Reflect.get(candidate, 'parent');
    const before = Reflect.get(candidate, 'before');
    if (
      !isRuntimeIdentity(identity) ||
      !isRuntimeIdentity(parent) ||
      (before !== undefined && !isRuntimeIdentity(before))
    ) {
      return patchError(operation);
    }
    return;
  }
  if (kind === 'replaceScene') {
    validateSceneRuntimeSnapshot(Reflect.get(candidate, 'snapshot') as SceneRuntimeSnapshot);
    return;
  }
  return patchError({ reason: 'unknown-operation-kind', operation });
};

const comparePrimitivePaths = (left: ReadonlyArray<number>, right: ReadonlyArray<number>): number => {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
};

const pathContains = (ancestor: ReadonlyArray<number>, descendant: ReadonlyArray<number>): boolean =>
  ancestor.length < descendant.length && ancestor.every((segment, index) => segment === descendant[index]);

const validateSnapshotTargetOverlap = (snapshot: SceneRuntimeSnapshot, targets: RuntimeIdentityMap<true>): void => {
  const paths = snapshot.topology
    .filter(node => targets.has(node.identity))
    .map(node => node.primitivePath)
    .sort(comparePrimitivePaths);
  for (let index = 1; index < paths.length; index += 1) {
    const previous = paths[index - 1];
    const current = paths[index];
    if (pathContains(previous, current)) {
      return patchError({ reason: 'overlapping-targets', ancestor: previous, descendant: current });
    }
  }
};

const validateNonOverlappingTargets = (
  operations: ReadonlyArray<ScenePatchOperation>,
  current: SceneRuntimeSnapshot,
  next: SceneRuntimeSnapshot,
): void => {
  const targets = createRuntimeIdentityMap<true>(
    operations
      .map(operationTarget)
      .filter(identity => identity !== undefined)
      .map(identity => [identity, true] as const),
  );
  validateSnapshotTargetOverlap(current, targets);
  validateSnapshotTargetOverlap(next, targets);
};

const validateOperationOrder = (operations: ReadonlyArray<ScenePatchOperation>): void => {
  let rank = -1;
  const singletonKinds = new Set<string>();
  const targets = createRuntimeIdentityMap<true>([]);
  for (const operation of operations) {
    const nextRank = operationRank(operation);
    if (nextRank < rank) patchError({ reason: 'operation-order', operation });
    rank = nextRank;
    if (['setResources', 'setLayout', 'setAnimations'].includes(operation.kind)) {
      if (singletonKinds.has(operation.kind)) patchError({ reason: 'duplicate-operation-kind', operation });
      singletonKinds.add(operation.kind);
    }
    const target = operationTarget(operation);
    if (target !== undefined) {
      if (!targets.set(target, true)) patchError({ reason: 'duplicate-target', operation });
    }
  }
};

type NextPlacement = Readonly<{
  parent: RuntimeIdentity;
  before?: RuntimeIdentity;
}>;

const createNextPlacementIndex = (next: SceneRuntimeSnapshot): RuntimeIdentityMap<NextPlacement> => {
  const siblingsByParent = createRuntimeIdentityMap<Array<SceneRuntimeNode>>([]);
  for (const node of next.topology) {
    const siblings = siblingsByParent.get(node.parent) ?? [];
    siblings.push(node);
    if (!siblingsByParent.has(node.parent)) siblingsByParent.set(node.parent, siblings);
  }
  const placements = createRuntimeIdentityMap<NextPlacement>([]);
  for (const parent of [next.root, ...next.topology.map(node => node.identity)]) {
    const siblings = siblingsByParent.get(parent);
    if (siblings === undefined) continue;
    siblings.sort((left, right) => left.order - right.order);
    siblings.forEach((node, index) => {
      const before = index + 1 < siblings.length ? siblings[index + 1].identity : undefined;
      placements.set(
        node.identity,
        Object.freeze({ parent: node.parent, ...(before === undefined ? {} : { before }) }),
      );
    });
  }
  return placements;
};

const validateBeforeAgainstNext = (
  placements: RuntimeIdentityMap<NextPlacement>,
  target: RuntimeIdentity,
  parent: RuntimeIdentity,
  before: RuntimeIdentity | undefined,
): void => {
  const placement = placements.get(target);
  if (placement === undefined || !runtimeIdentityEquals(placement.parent, parent)) {
    return patchError({ reason: 'target-missing-from-next-parent', target, parent });
  }
  const expected = placement.before;
  const matches =
    before === undefined ? expected === undefined : expected !== undefined && runtimeIdentityEquals(before, expected);
  if (!matches) patchError({ reason: 'before-mismatch', before, expected });
};

/** 按 Runtime identity 语义比较两个完整 Scene snapshots */
export const sceneRuntimeSnapshotEquals = (left: SceneRuntimeSnapshot, right: SceneRuntimeSnapshot): boolean =>
  left.revision === right.revision &&
  runtimeIdentityEquals(left.root, right.root) &&
  runtimeStructuralEquals(left.scene, right.scene) &&
  left.topology.length === right.topology.length &&
  left.topology.every((node, index) => {
    const other = right.topology[index];
    return (
      runtimeIdentityEquals(node.identity, other.identity) &&
      runtimeIdentityEquals(node.semanticOwner, other.semanticOwner) &&
      runtimeIdentityEquals(node.parent, other.parent) &&
      node.order === other.order &&
      node.publicId === other.publicId &&
      runtimeStructuralEquals(node.primitivePath, other.primitivePath)
    );
  });

/** 校验完整 Runtime Scene snapshot 的 topology 双射与 parent/order 契约 */
const validateSceneRuntimeSnapshotInternal = (snapshot: SceneRuntimeSnapshot): void => {
  const candidate: unknown = snapshot;
  const candidateScene =
    typeof candidate === 'object' && candidate !== null ? Reflect.get(candidate, 'scene') : undefined;
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    !Number.isSafeInteger(Reflect.get(candidate, 'revision')) ||
    Reflect.get(candidate, 'revision') < 0 ||
    typeof candidateScene !== 'object' ||
    candidateScene === null ||
    !Array.isArray(Reflect.get(candidateScene, 'primitives')) ||
    !isDenseArray(Reflect.get(candidateScene, 'resources'), () => true) ||
    !isDenseArray(Reflect.get(candidateScene, 'animations'), () => true) ||
    !isDenseArray(Reflect.get(candidate, 'topology'), node => typeof node === 'object' && node !== null)
  ) {
    topologyError(snapshot);
  }
  validatePrimitiveArray(snapshot.scene.primitives);
  validateTopology(snapshot.scene.primitives, snapshot.root, snapshot.topology);
};

/** 校验完整 Runtime Scene snapshot 的 topology 双射与 parent/order 契约 */
export const validateSceneRuntimeSnapshot = (snapshot: SceneRuntimeSnapshot): void => {
  try {
    validateSceneRuntimeSnapshotInternal(snapshot);
  } catch (cause) {
    if (isRetainedRenderError(cause)) throw cause;
    return topologyError(cause);
  }
};

/** 校验 Patch 规范化、revision lineage，并证明重放结果与 next snapshot coherent */
const validateScenePatchInternal = (
  current: SceneRuntimeSnapshot,
  patch: ScenePatch,
  next: SceneRuntimeSnapshot,
): void => {
  validateSceneRuntimeSnapshot(current);
  validateSceneRuntimeSnapshot(next);
  if (
    !Number.isSafeInteger(patch.baseRevision) ||
    !Number.isSafeInteger(patch.nextRevision) ||
    patch.baseRevision !== current.revision ||
    patch.nextRevision !== next.revision ||
    patch.nextRevision !== patch.baseRevision + 1
  ) {
    revisionError({ current: current.revision, patch, next: next.revision });
  }
  if (!runtimeIdentityEquals(current.root, next.root) || !Array.isArray(patch.operations)) {
    patchError({ reason: 'root-or-operations', patch });
  }
  if (!isDenseArray(patch.operations, operation => typeof operation === 'object' && operation !== null)) {
    patchError({ reason: 'sparse-or-malformed-operations', patch });
  }
  for (const operation of patch.operations) validateOperationShape(operation);
  const replacements = patch.operations.filter(operation => operation.kind === 'replaceScene');
  if (replacements.length > 0) {
    if (patch.operations.length !== 1 || replacements.length !== 1) patchError({ reason: 'replace-not-exclusive' });
    const replacement = replacements[0];
    validateSceneRuntimeSnapshot(replacement.snapshot);
    if (!sceneRuntimeSnapshotEquals(replacement.snapshot, next)) mismatchError({ reason: 'replace-mismatch' });
    return;
  }
  validateOperationOrder(patch.operations);
  validateNonOverlappingTargets(patch.operations, current, next);

  const tree = buildMutableTree(current);
  const index = indexMutableTree(tree);
  const nextPlacements = createNextPlacementIndex(next);
  let scene: RuntimeScene = {
    ...current.scene,
    primitives: materializeChildren(tree),
  };
  for (const operation of patch.operations) {
    if (operation.kind === 'setResources') {
      scene = { ...scene, resources: operation.resources };
      continue;
    }
    if (operation.kind === 'setLayout') {
      scene = { ...scene, layout: operation.layout };
      continue;
    }
    if (operation.kind === 'setAnimations') {
      scene = { ...scene, animations: operation.animations };
      continue;
    }
    if (operation.kind === 'insert') {
      validateSubtree(operation.subtree);
      if (index.has(operation.subtree.root)) patchError({ reason: 'insert-existing', operation });
      const parent = runtimeIdentityEquals(operation.parent, tree.identity) ? tree : index.get(operation.parent);
      if (parent === undefined) return patchError({ reason: 'insert-parent', operation });
      if (isMutableSceneNode(parent) && parent.basePrimitive.type !== 'group') {
        return patchError({ reason: 'insert-parent', operation });
      }
      const node = buildMutableSubtree(operation.subtree, parent);
      const before = operation.before === undefined ? undefined : index.get(operation.before);
      if (operation.before !== undefined && before === undefined) {
        return patchError({ reason: 'before-not-sibling', before: operation.before });
      }
      insertNodeBefore(parent, node, before);
      addMutableSubtreeToIndex(node, index);
      validateBeforeAgainstNext(nextPlacements, node.identity, operation.parent, operation.before);
      continue;
    }
    if (operation.kind === 'update') {
      validateSubtree(operation.subtree);
      if (!runtimeIdentityEquals(operation.identity, operation.subtree.root)) patchError(operation);
      const previous = index.get(operation.identity);
      if (previous === undefined) return patchError({ reason: 'update-missing', operation });
      const parent = previous.parent;
      const before = previous.next;
      detach(previous);
      removeMutableSubtreeFromIndex(previous, index);
      const replacement = buildMutableSubtree(operation.subtree, parent);
      insertNodeBefore(parent, replacement, before);
      addMutableSubtreeToIndex(replacement, index);
      continue;
    }
    if (operation.kind === 'remove') {
      const node = index.get(operation.identity);
      if (node === undefined) return patchError({ reason: 'remove-missing', operation });
      detach(node);
      removeMutableSubtreeFromIndex(node, index);
      continue;
    }
    if (operation.kind === 'move') {
      const node = index.get(operation.identity);
      const parent = runtimeIdentityEquals(operation.parent, tree.identity) ? tree : index.get(operation.parent);
      if (node === undefined || parent === undefined) return patchError({ reason: 'move-target-parent', operation });
      if (isMutableSceneNode(parent) && parent.basePrimitive.type !== 'group') {
        return patchError({ reason: 'move-target-parent', operation });
      }
      let cursor: MutableSceneNode | MutableSceneRoot = parent;
      while ('parent' in cursor) {
        if (cursor === node) patchError({ reason: 'move-cycle', operation });
        cursor = cursor.parent;
      }
      detach(node);
      const before = operation.before === undefined ? undefined : index.get(operation.before);
      if (operation.before !== undefined && before === undefined) {
        return patchError({ reason: 'before-not-sibling', before: operation.before });
      }
      insertNodeBefore(parent, node, before);
      validateBeforeAgainstNext(nextPlacements, node.identity, operation.parent, operation.before);
    }
  }
  scene = { ...scene, primitives: materializeChildren(tree) };
  const replayed = {
    revision: patch.nextRevision,
    scene,
    root: tree.identity,
    topology: materializeTopology(tree),
  } satisfies SceneRuntimeSnapshot;
  if (!sceneRuntimeSnapshotEquals(replayed, next)) mismatchError({ replayed, next });
};

/** 校验 Patch 规范化、revision lineage，并证明重放结果与 next snapshot coherent */
export const validateScenePatch = (
  current: SceneRuntimeSnapshot,
  patch: ScenePatch,
  next: SceneRuntimeSnapshot,
): void => {
  try {
    validateScenePatchInternal(current, patch, next);
  } catch (cause) {
    if (isRetainedRenderError(cause)) throw cause;
    return patchError(cause);
  }
};

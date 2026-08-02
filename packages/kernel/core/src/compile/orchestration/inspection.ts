import type {
  AnyCompositeInspectorDefinition,
  BaseLayoutInspectOptions,
  CompileInspectionOptions,
  CompileOccurrenceLocator,
  CompositeInspectionAuthoringTree,
  CompositeInspectionChild,
  CompositeInspectionChildForest,
  InspectionOptionsInputObject,
  InspectionPlane,
  InspectionPrimitive,
  InspectOptions,
  ResolvedBaseLayoutInspectOptions,
} from '../../contract';
import type { IRChild, IRJsonObject, IRScene, JsonValue } from '../../schemas';
import type {
  CompositeCompileOwner,
  CompositeCompileSession,
  InheritedInspectionState,
  PendingInspectionEntry,
  PreparedCompositeInspectionChildForest,
} from './types';

import {
  BaseLayoutInspectOptionsInputSchema,
  BaseLayoutInspectOptionsSchema,
  InspectionPlaneSchema,
  InspectionPrimitiveSchema,
  InspectOptionsInputSchema,
} from '../../contract';
import { cloneAndFreezeJson } from '../../shared/json';
import { applyTransformChain } from '../transform';
import { compareCompileOccurrences, freezeOccurrence } from './artifact';

const BaseKeys = new Set(['bounds', 'spacing', 'overflow', 'alignmentGuides', 'labels']);

type PreparedInspectionRoot = Readonly<{
  tree: CompositeInspectionAuthoringTree;
}>;

/** compile 入口完成 admission 后的 inspection sidecar */
export type PreparedCompileInspection = Readonly<{
  root?: InspectOptions;
  roots: ReadonlyMap<string, PreparedInspectionRoot>;
}>;

/** 单个 Composite inspector 的完整求值请求 */
export type ResolvedCompositeInspection = Readonly<{
  baseOptions: ResolvedBaseLayoutInspectOptions;
  options: IRJsonObject;
}>;

/** 当前 Composite occurrence 的 inspection 求值上下文 */
export type ResolvedCompositeInspectionContext = Readonly<{
  inherited: InheritedInspectionState;
  tree?: CompositeInspectionAuthoringTree;
  request?: ResolvedCompositeInspection;
}>;

const isScope = (child: IRChild): child is Extract<IRChild, { type: 'scope' }> =>
  !('namespace' in child) && child.type === 'scope';

const sceneSourcePathOf = (ir: IRScene, path: ReadonlyArray<{ kind: string; index: number }>): string => {
  if (path.length === 0 || path[0]?.kind !== 'sceneChild') {
    throw new Error('CompileOptions.inspection root locator must start with sceneChild.');
  }
  let child = Reflect.get(ir.children, path[0].index) as IRChild | undefined;
  if (child === undefined) throw new Error('CompileOptions.inspection root locator is out of bounds.');
  let sourcePath = `children[${path[0].index}]`;
  for (const segment of path.slice(1)) {
    if (Reflect.get(segment, 'kind') !== 'scopeChild' || !isScope(child)) {
      throw new Error('CompileOptions.inspection root locator may only descend through IRScope children.');
    }
    const next: unknown = Reflect.get(child.children, segment.index);
    if (next === undefined) throw new Error('CompileOptions.inspection root locator is out of bounds.');
    child = next as IRChild;
    sourcePath += `.scope.children[${segment.index}]`;
  }
  if (!('namespace' in child)) {
    throw new Error('CompileOptions.inspection root locator must target a Composite occurrence.');
  }
  return sourcePath;
};

const childLocatorKey = (path: ReadonlyArray<{ kind: 'scopeChild'; index: number }>): string =>
  path.map(segment => `scope.children[${segment.index}]`).join('.');

const childTargetOf = (root: IRChild, path: ReadonlyArray<{ kind: 'scopeChild'; index: number }>): IRChild => {
  let child = root;
  for (const segment of path) {
    if (!isScope(child)) {
      throw new Error('Composite inspection child locator may only descend through IRScope children.');
    }
    const next = Reflect.get(child.children, segment.index) as IRChild | undefined;
    if (next === undefined) throw new Error('Composite inspection child locator is out of bounds.');
    child = next;
  }
  if (!('namespace' in child)) {
    throw new Error('Composite inspection child locator must target a Composite occurrence.');
  }
  return child;
};

const validateInputObject = (value: unknown, label: string): InspectionOptionsInputObject => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a boolean or sparse object.`);
  }
  return value as InspectionOptionsInputObject;
};

const validateTree = (tree: CompositeInspectionAuthoringTree, label: string): void => {
  if (tree.policy?.inherited !== undefined) InspectOptionsInputSchema.parse(tree.policy.inherited);
  if (tree.policy?.component !== undefined && typeof tree.policy.component !== 'boolean') {
    validateInputObject(tree.policy.component, `${label}.policy.component`);
  }
  const children = tree.children;
  if (children === undefined) return;
  for (let childIndex = 0; childIndex < children.length; childIndex += 1) {
    if (!(childIndex in children)) throw new Error(`${label}.children must be dense.`);
    const forest = Reflect.get(children, childIndex) as CompositeInspectionChildForest | null | undefined;
    if (forest === undefined || forest === null) continue;
    for (let rootIndex = 0; rootIndex < forest.length; rootIndex += 1) {
      if (!(rootIndex in forest)) throw new Error(`${label}.children[${childIndex}] must be dense.`);
      const root = forest[rootIndex];
      root.locator.path.forEach((segment, segmentIndex) => {
        const segmentRecord = segment as unknown as Readonly<Record<string, unknown>>;
        if (segmentRecord.kind !== 'scopeChild' || !Number.isSafeInteger(segment.index) || segment.index < 0) {
          throw new Error(`${label}.children[${childIndex}][${rootIndex}].locator.path[${segmentIndex}] is invalid.`);
        }
      });
      validateTree(root.tree, `${label}.children[${childIndex}][${rootIndex}].tree`);
    }
  }
};

/** 校验并索引 compile inspection sidecar */
export const prepareCompileInspection = (
  ir: IRScene,
  input: CompileInspectionOptions | undefined,
): PreparedCompileInspection | undefined => {
  if (input === undefined) return undefined;
  const root = input.root === undefined ? undefined : InspectOptionsInputSchema.parse(input.root);
  const roots = new Map<string, PreparedInspectionRoot>();
  input.roots?.forEach((candidate, index) => {
    candidate.locator.path.forEach((segment, segmentIndex) => {
      if (!Number.isSafeInteger(segment.index) || segment.index < 0) {
        throw new Error(`CompileOptions.inspection roots[${index}].locator.path[${segmentIndex}] is invalid.`);
      }
    });
    const sourcePath = sceneSourcePathOf(ir, candidate.locator.path);
    if (roots.has(sourcePath)) throw new Error(`CompileOptions.inspection has duplicate root '${sourcePath}'.`);
    validateTree(candidate.tree, `CompileOptions.inspection roots[${index}].tree`);
    roots.set(sourcePath, Object.freeze({ tree: candidate.tree }));
  });
  return Object.freeze({ ...(root === undefined ? {} : { root }), roots });
};

/** 校验 layoutChild authored forest，并按相对 Scope path 建立只读索引 */
export const prepareCompositeInspectionChildForest = (
  child: IRChild,
  forest: CompositeInspectionChildForest,
): PreparedCompositeInspectionChildForest => {
  const prepared = new Map<string, CompositeInspectionAuthoringTree>();
  forest.forEach((root, index) => {
    root.locator.path.forEach((segment, segmentIndex) => {
      const segmentRecord = segment as unknown as Readonly<Record<string, unknown>>;
      if (segmentRecord.kind !== 'scopeChild' || !Number.isSafeInteger(segment.index) || segment.index < 0) {
        throw new Error(`Composite inspection child forest[${index}].locator.path[${segmentIndex}] is invalid.`);
      }
    });
    childTargetOf(child, root.locator.path);
    const key = childLocatorKey(root.locator.path);
    if (prepared.has(key)) {
      throw new Error(`Composite inspection child forest has duplicate locator '${key || '<root>'}'.`);
    }
    prepared.set(key, root.tree);
  });
  return prepared;
};

/** 在 probe traversal 中把动态 occurrence 映射回 authored child forest */
export const lookupCompositeInspectionChildTree = (
  forest: PreparedCompositeInspectionChildForest | undefined,
  rootOccurrence: CompileOccurrenceLocator | undefined,
  occurrence: CompileOccurrenceLocator,
): CompositeInspectionAuthoringTree | undefined => {
  if (forest === undefined || rootOccurrence === undefined || occurrence.sourcePath !== rootOccurrence.sourcePath) {
    return undefined;
  }
  const prefix = rootOccurrence.expansionPath;
  if (occurrence.expansionPath.length < prefix.length) return undefined;
  for (const [index, segment] of prefix.entries()) {
    const candidate = Reflect.get(occurrence.expansionPath, index) as
      | CompileOccurrenceLocator['expansionPath'][number]
      | undefined;
    if (candidate === undefined || candidate.kind !== segment.kind || candidate.index !== segment.index)
      return undefined;
  }
  const suffix = occurrence.expansionPath.slice(prefix.length);
  if (suffix.some(segment => segment.kind !== 'scopeChild')) return undefined;
  return forest.get(childLocatorKey(suffix as ReadonlyArray<{ kind: 'scopeChild'; index: number }>));
};

const mergeBase = (current: BaseLayoutInspectOptions, next: BaseLayoutInspectOptions): BaseLayoutInspectOptions => {
  const currentBounds = current.bounds;
  const nextBounds = next.bounds;
  const currentSpacing = current.spacing;
  const nextSpacing = next.spacing;
  return {
    ...current,
    ...next,
    ...(nextBounds === undefined
      ? {}
      : {
          bounds:
            typeof nextBounds === 'object' && typeof currentBounds === 'object'
              ? { ...currentBounds, ...nextBounds }
              : nextBounds,
        }),
    ...(nextSpacing === undefined
      ? {}
      : {
          spacing:
            typeof nextSpacing === 'object' && typeof currentSpacing === 'object'
              ? { ...currentSpacing, ...nextSpacing }
              : nextSpacing,
        }),
  };
};

const applyInherited = (
  state: InheritedInspectionState,
  next: InspectOptions | undefined,
): InheritedInspectionState => {
  if (next === undefined || state.blocked) return state;
  const parsed = InspectOptionsInputSchema.parse(next);
  if (parsed.enabled === false) return Object.freeze({ blocked: true, layout: false });
  if (parsed.layout === undefined) return state;
  if (parsed.layout === false) return Object.freeze({ blocked: false, layout: false });
  if (parsed.layout === true) {
    return Object.freeze({ blocked: false, layout: state.layout === false ? {} : state.layout });
  }
  return Object.freeze({
    blocked: false,
    layout: mergeBase(state.layout === false ? {} : state.layout, parsed.layout),
  });
};

const splitComponentOptions = (
  input: InspectionOptionsInputObject,
): Readonly<{ base: BaseLayoutInspectOptions; local: InspectionOptionsInputObject }> => {
  const base: Record<string, unknown> = {};
  const local: Record<string, unknown> = {};
  Object.entries(input).forEach(([key, value]) => (BaseKeys.has(key) ? (base[key] = value) : (local[key] = value)));
  return Object.freeze({
    base: BaseLayoutInspectOptionsInputSchema.parse(base),
    local: Object.freeze(local),
  });
};

const resolveInspectionRequest = (
  state: InheritedInspectionState,
  tree: CompositeInspectionAuthoringTree | undefined,
  inspector: AnyCompositeInspectorDefinition | undefined,
): ResolvedCompositeInspection | undefined => {
  if (inspector === undefined || state.blocked) return undefined;
  const component = tree?.policy?.component;
  if (component === false) return undefined;
  const inheritedEnabled = state.layout !== false;
  if (component === undefined && !inheritedEnabled) return undefined;

  let base = state.layout === false ? {} : state.layout;
  let local: InspectionOptionsInputObject = {};
  if (component !== undefined && component !== true) {
    const split = splitComponentOptions(validateInputObject(component, 'Composite inspection component'));
    base = mergeBase(base, split.base);
    local = split.local;
  }

  const localInput = inspector.localOptionsInputSchema.parse(local);
  const resolvedLocal = inspector.localOptionsSchema.parse(localInput);
  const frozenLocal = cloneAndFreezeJson(resolvedLocal, 'Composite inspector local options');
  if (frozenLocal === null || typeof frozenLocal !== 'object' || Array.isArray(frozenLocal)) {
    throw new Error('Composite inspector local options must resolve to a JSON object.');
  }
  return Object.freeze({
    baseOptions: BaseLayoutInspectOptionsSchema.parse(base),
    options: frozenLocal as IRJsonObject,
  });
};

/** 求值当前 occurrence 的 inherited、component 与 child forest inspection 上下文 */
export const resolveCompositeInspection = (
  prepared: PreparedCompileInspection | undefined,
  occurrence: CompileOccurrenceLocator,
  inspector: AnyCompositeInspectorDefinition | undefined,
  inherited?: InheritedInspectionState,
  authoredTree?: CompositeInspectionAuthoringTree,
): ResolvedCompositeInspectionContext => {
  const tree = authoredTree ?? (inherited === undefined ? prepared?.roots.get(occurrence.sourcePath)?.tree : undefined);
  const rootState = inherited ?? applyInherited(Object.freeze({ blocked: false, layout: false }), prepared?.root);
  const state = applyInherited(rootState, tree?.policy?.inherited);
  const request = resolveInspectionRequest(state, tree, inspector);
  return Object.freeze({
    inherited: state,
    ...(tree === undefined ? {} : { tree }),
    ...(request === undefined ? {} : { request }),
  });
};

/** 为当前 callback 暴露稳定复用的 opaque inspection child handles */
export const createLayoutCompositeInspectionContext = (
  session: CompositeCompileSession,
  owner: CompositeCompileOwner,
  tree: CompositeInspectionAuthoringTree | undefined,
) => {
  const handles = new Map<number, CompositeInspectionChild>();
  return Object.freeze({
    child: (index: number): CompositeInspectionChild | undefined => {
      if (!Number.isSafeInteger(index) || index < 0) {
        throw new Error('Composite inspection child index must be a non-negative safe integer.');
      }
      if (tree?.children !== undefined && index >= tree.children.length) {
        throw new Error(`Composite inspection child index ${index} is out of bounds.`);
      }
      const forest = tree?.children?.[index];
      if (forest === undefined || forest === null) return undefined;
      const cached = handles.get(index);
      if (cached !== undefined) return cached;
      const handle = Object.freeze({}) as CompositeInspectionChild;
      session.inspectionChildren.set(handle, { owner, forest });
      handles.set(index, handle);
      return handle;
    },
  });
};

/** 校验 opaque handle 所属 callback，并为 layoutChild 解析 authored forest */
export const resolveLayoutChildInspection = (
  session: CompositeCompileSession,
  owner: CompositeCompileOwner,
  handle: CompositeInspectionChild | undefined,
  child: IRChild,
): PreparedCompositeInspectionChildForest | undefined => {
  if (handle === undefined) return undefined;
  const entry = session.inspectionChildren.get(handle);
  if (entry === undefined || entry.owner !== owner) {
    throw new Error('Composite inspection child handle belongs to another callback or compile.');
  }
  if (entry.boundChild !== undefined && entry.boundChild !== child) {
    throw new Error('Composite inspection child handle cannot bind a different IRChild.');
  }
  entry.boundChild = child;
  entry.prepared ??= prepareCompositeInspectionChildForest(child, entry.forest);
  return entry.prepared;
};

/** 调用 erased inspector，并校验、克隆和冻结受限 primitive 输出 */
export const runCompositeInspector = (
  inspector: AnyCompositeInspectorDefinition,
  artifact: JsonValue,
  occurrence: CompileOccurrenceLocator,
  resolved: ResolvedCompositeInspection,
): ReadonlyArray<InspectionPrimitive> => {
  const inspect = inspector.inspect as unknown as (
    value: JsonValue,
    context: Readonly<{
      occurrence: CompileOccurrenceLocator;
      baseOptions: ResolvedBaseLayoutInspectOptions;
      options: IRJsonObject;
    }>,
  ) => unknown;
  const output = inspect(artifact, {
    occurrence,
    baseOptions: resolved.baseOptions,
    options: resolved.options,
  });
  if (!Array.isArray(output)) throw new Error('Composite inspector must return an array of inspection primitives.');
  const parsed = output.map(value => InspectionPrimitiveSchema.parse(value));
  return cloneAndFreezeJson(parsed, 'Composite inspector primitives');
};

const matrixOf = (entry: PendingInspectionEntry): readonly [number, number, number, number, number, number] => {
  const origin = applyTransformChain([0, 0], entry.scopeChain);
  const xBasis = applyTransformChain([1, 0], entry.scopeChain);
  const yBasis = applyTransformChain([0, 1], entry.scopeChain);
  return [
    xBasis[0] - origin[0],
    xBasis[1] - origin[1],
    yBasis[0] - origin[0],
    yBasis[1] - origin[1],
    origin[0],
    origin[1],
  ];
};

/** 把 pending entries 排序并封装为独立 inspection plane */
export const sealInspectionPlane = (entries: ReadonlyArray<PendingInspectionEntry>): InspectionPlane | null => {
  if (entries.length === 0) return null;
  const ordered = entries
    .map((entry, index) => ({ entry, index }))
    .sort(
      (left, right) =>
        compareCompileOccurrences(left.entry.occurrence, right.entry.occurrence) || left.index - right.index,
    )
    .map(({ entry }, colorScope) => ({
      occurrence: freezeOccurrence(entry.occurrence),
      colorScope,
      transform: matrixOf(entry),
      primitives: entry.primitives,
    }));
  return cloneAndFreezeJson(InspectionPlaneSchema.parse({ entries: ordered }), 'Inspection plane');
};

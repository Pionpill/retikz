import type {
  AnyInspectorDefinition,
  ChildInspectionAuthoringLocator,
  CompileInspectionOptions,
  CompileOccurrenceLocator,
  CompositeInspectionChild,
  InspectionAuthoringTargetKind,
  InspectionAuthoringTree,
  InspectionChildForest,
  InspectionDiagnosticOrigin,
  InspectionOptionsInputObject,
  InspectionOwner,
  InspectOptions,
  SceneInspectionAuthoringLocator,
} from '../../contract';
import type { IRChild, IRJsonObject, IRScene } from '../../schemas';
import type {
  CompositeCompileOwner,
  CompositeCompileSession,
  InheritedInspectionState,
  PreparedCompositeInspectionChildForest,
} from './types';

import { InspectOptionsInputSchema } from '../../contract';
import { cloneAndFreezeJson } from '../../shared/json';
import { inspectionOccurrenceResolveOrigin, wrapInspectionError } from './inspection-error';

type PreparedInspectionRoot = Readonly<{
  target: InspectionAuthoringTargetKind;
  tree: InspectionAuthoringTree;
}>;

/** compile 入口完成 admission 后的 inspection sidecar */
export type PreparedCompileInspection = Readonly<{
  root?: InspectOptions;
  roots: ReadonlyMap<string, PreparedInspectionRoot>;
}>;

/** 单个 owner Inspector 的完整 canonical options 请求 */
export type ResolvedInspectionRequest = Readonly<{ options: IRJsonObject }>;

/** 当前 occurrence 的 inherited、authored tree 与可选请求 */
export type ResolvedInspectionContext = Readonly<{
  inherited: InheritedInspectionState;
  tree?: InspectionAuthoringTree;
  request?: ResolvedInspectionRequest;
}>;

const isScope = (child: IRChild): child is Extract<IRChild, { type: 'scope' }> =>
  !('namespace' in child) && child.type === 'scope';

const targetKindOf = (child: IRChild): InspectionAuthoringTargetKind | undefined => {
  if ('namespace' in child) return 'composite';
  return child.type === 'path' ? 'path' : undefined;
};

const assertTarget = (child: IRChild, target: InspectionAuthoringTargetKind, label: string): void => {
  const actual = targetKindOf(child);
  if (actual === target) return;
  const actualLabel = actual === 'composite' ? 'Composite' : actual === 'path' ? 'Path' : child.type;
  throw new Error(`${label} target '${target}' does not match authored ${actualLabel} child.`);
};

const resolveSceneTarget = (
  ir: IRScene,
  path: ReadonlyArray<{ kind: string; index: number }>,
): Readonly<{ child: IRChild; sourcePath: string }> => {
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
    const next = Reflect.get(child.children, segment.index) as IRChild | undefined;
    if (next === undefined) throw new Error('CompileOptions.inspection root locator is out of bounds.');
    child = next;
    sourcePath += `.scope.children[${segment.index}]`;
  }
  return Object.freeze({ child, sourcePath });
};

const childLocatorKey = (path: ReadonlyArray<{ kind: 'scopeChild'; index: number }>): string =>
  path.map(segment => `scope.children[${segment.index}]`).join('.');

const resolveChildTarget = (root: IRChild, path: ReadonlyArray<{ kind: 'scopeChild'; index: number }>): IRChild => {
  let child = root;
  for (const segment of path) {
    if (!isScope(child)) {
      throw new Error('Inspection child locator may only descend through IRScope children.');
    }
    const next = Reflect.get(child.children, segment.index) as IRChild | undefined;
    if (next === undefined) throw new Error('Inspection child locator is out of bounds.');
    child = next;
  }
  return child;
};

const validateInputObject = (value: unknown, label: string): InspectionOptionsInputObject => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a boolean or sparse object.`);
  }
  return value as InspectionOptionsInputObject;
};

const validateTargetKind = (value: unknown, label: string): InspectionAuthoringTargetKind => {
  if (value !== 'composite' && value !== 'path') {
    throw new Error(`${label} must be 'composite' or 'path'.`);
  }
  return value;
};

const validateTree = (tree: InspectionAuthoringTree, label: string, target: InspectionAuthoringTargetKind): void => {
  if (tree.policy?.inherited !== undefined) InspectOptionsInputSchema.parse(tree.policy.inherited);
  if (tree.policy?.self !== undefined && typeof tree.policy.self !== 'boolean') {
    validateInputObject(tree.policy.self, `${label}.policy.self`);
  }
  const children = tree.children;
  if (target === 'path' && children !== undefined) {
    throw new Error(`${label}.children must be omitted for a Path inspection target.`);
  }
  if (children === undefined) return;
  for (let childIndex = 0; childIndex < children.length; childIndex += 1) {
    if (!(childIndex in children)) throw new Error(`${label}.children must be dense.`);
    const forest = Reflect.get(children, childIndex) as InspectionChildForest | null | undefined;
    if (forest === undefined || forest === null) continue;
    for (let rootIndex = 0; rootIndex < forest.length; rootIndex += 1) {
      if (!(rootIndex in forest)) throw new Error(`${label}.children[${childIndex}] must be dense.`);
      const root = forest[rootIndex];
      const rootTarget = validateTargetKind(
        Reflect.get(root.locator, 'target'),
        `${label}.children[${childIndex}][${rootIndex}].locator.target`,
      );
      root.locator.path.forEach((segment, segmentIndex) => {
        const segmentRecord = segment as unknown as Readonly<Record<string, unknown>>;
        if (segmentRecord.kind !== 'scopeChild' || !Number.isSafeInteger(segment.index) || segment.index < 0) {
          throw new Error(`${label}.children[${childIndex}][${rootIndex}].locator.path[${segmentIndex}] is invalid.`);
        }
      });
      validateTree(root.tree, `${label}.children[${childIndex}][${rootIndex}].tree`, rootTarget);
    }
  }
};

const sceneAuthoringOrigin = (locator: SceneInspectionAuthoringLocator): InspectionDiagnosticOrigin => ({
  kind: 'inspection',
  stage: 'resolve',
  site: 'authoring',
  locator: { kind: 'scene', value: locator },
});

const childAuthoringOrigin = (locator: ChildInspectionAuthoringLocator): InspectionDiagnosticOrigin => ({
  kind: 'inspection',
  stage: 'resolve',
  site: 'authoring',
  locator: { kind: 'child', value: locator },
});

/** 校验并索引 compile inspection sidecar */
export const prepareCompileInspection = (
  ir: IRScene,
  input: CompileInspectionOptions | undefined,
): PreparedCompileInspection | undefined => {
  if (input === undefined) return undefined;
  const root = input.root === undefined ? undefined : InspectOptionsInputSchema.parse(input.root);
  const roots = new Map<string, PreparedInspectionRoot>();
  input.roots?.forEach((candidate, index) => {
    const target = validateTargetKind(
      Reflect.get(candidate.locator, 'target'),
      `CompileOptions.inspection roots[${index}].locator.target`,
    );
    const locator = cloneAndFreezeJson(candidate.locator, `CompileOptions.inspection roots[${index}].locator`);
    try {
      locator.path.forEach((segment, segmentIndex) => {
        if (!Number.isSafeInteger(segment.index) || segment.index < 0) {
          throw new Error(`CompileOptions.inspection roots[${index}].locator.path[${segmentIndex}] is invalid.`);
        }
      });
      const resolved = resolveSceneTarget(ir, locator.path);
      assertTarget(resolved.child, target, `CompileOptions.inspection roots[${index}].locator`);
      const occurrenceSourcePath = target === 'path' ? `${resolved.sourcePath}.path` : resolved.sourcePath;
      if (roots.has(occurrenceSourcePath)) {
        throw new Error(`CompileOptions.inspection has duplicate root '${occurrenceSourcePath}'.`);
      }
      validateTree(candidate.tree, `CompileOptions.inspection roots[${index}].tree`, target);
      roots.set(occurrenceSourcePath, Object.freeze({ target, tree: candidate.tree }));
    } catch (cause) {
      throw wrapInspectionError(sceneAuthoringOrigin(locator), cause);
    }
  });
  return Object.freeze({ ...(root === undefined ? {} : { root }), roots });
};

/** 校验 layoutChild authored forest，并按相对 Scope path 建立只读索引 */
export const prepareCompositeInspectionChildForest = (
  child: IRChild,
  forest: InspectionChildForest,
): PreparedCompositeInspectionChildForest => {
  const prepared = new Map<string, InspectionAuthoringTree>();
  forest.forEach((root, index) => {
    const target = validateTargetKind(
      Reflect.get(root.locator, 'target'),
      `Inspection child forest[${index}].locator.target`,
    );
    const locator = cloneAndFreezeJson(root.locator, `Inspection child forest[${index}].locator`);
    try {
      locator.path.forEach((segment, segmentIndex) => {
        const segmentRecord = segment as unknown as Readonly<Record<string, unknown>>;
        if (segmentRecord.kind !== 'scopeChild' || !Number.isSafeInteger(segment.index) || segment.index < 0) {
          throw new Error(`Inspection child forest[${index}].locator.path[${segmentIndex}] is invalid.`);
        }
      });
      const targetChild = resolveChildTarget(child, locator.path);
      assertTarget(targetChild, target, `Inspection child forest[${index}].locator`);
      validateTree(root.tree, `Inspection child forest[${index}].tree`, target);
      const key = childLocatorKey(locator.path);
      if (prepared.has(key)) throw new Error(`Inspection child forest has duplicate locator '${key || '<root>'}'.`);
      prepared.set(key, root.tree);
    } catch (cause) {
      throw wrapInspectionError(childAuthoringOrigin(locator), cause);
    }
  });
  return prepared;
};

/** 在 probe traversal 中把动态 occurrence 映射回 authored child forest */
export const lookupCompositeInspectionChildTree = (
  forest: PreparedCompositeInspectionChildForest | undefined,
  rootOccurrence: CompileOccurrenceLocator | undefined,
  occurrence: CompileOccurrenceLocator,
): InspectionAuthoringTree | undefined => {
  if (forest === undefined || rootOccurrence === undefined || occurrence.sourcePath !== rootOccurrence.sourcePath) {
    return undefined;
  }
  const prefix = rootOccurrence.expansionPath;
  if (occurrence.expansionPath.length < prefix.length) return undefined;
  for (const [index, segment] of prefix.entries()) {
    const candidate = Reflect.get(occurrence.expansionPath, index) as
      | CompileOccurrenceLocator['expansionPath'][number]
      | undefined;
    if (candidate === undefined || candidate.kind !== segment.kind || candidate.index !== segment.index) {
      return undefined;
    }
  }
  const suffix = occurrence.expansionPath.slice(prefix.length);
  if (suffix.some(segment => segment.kind !== 'scopeChild')) return undefined;
  return forest.get(childLocatorKey(suffix as ReadonlyArray<{ kind: 'scopeChild'; index: number }>));
};

const mergeNestedInput = (
  current: InspectionOptionsInputObject,
  next: InspectionOptionsInputObject,
): InspectionOptionsInputObject => ({
  ...current,
  ...next,
  ...(['bounds', 'spacing'] as const).reduce<Record<string, unknown>>((merged, key) => {
    const currentValue = Reflect.get(current, key);
    const nextValue = Reflect.get(next, key);
    if (nextValue === undefined) return merged;
    merged[key] =
      typeof currentValue === 'object' &&
      currentValue !== null &&
      !Array.isArray(currentValue) &&
      typeof nextValue === 'object' &&
      nextValue !== null &&
      !Array.isArray(nextValue)
        ? { ...currentValue, ...nextValue }
        : nextValue;
    return merged;
  }, {}),
});

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
    layout: mergeNestedInput(state.layout === false ? {} : state.layout, parsed.layout),
  });
};

const resolveContext = (
  prepared: PreparedCompileInspection | undefined,
  occurrence: CompileOccurrenceLocator,
  inherited?: InheritedInspectionState,
  authoredTree?: InspectionAuthoringTree,
): Readonly<{ inherited: InheritedInspectionState; tree?: InspectionAuthoringTree }> => {
  const tree = authoredTree ?? (inherited === undefined ? prepared?.roots.get(occurrence.sourcePath)?.tree : undefined);
  const rootState = inherited ?? applyInherited(Object.freeze({ blocked: false, layout: false }), prepared?.root);
  const state = applyInherited(rootState, tree?.policy?.inherited);
  return Object.freeze({ inherited: state, ...(tree === undefined ? {} : { tree }) });
};

const parseRequest = (
  inspector: AnyInspectorDefinition,
  input: InspectionOptionsInputObject,
  label: string,
): ResolvedInspectionRequest => {
  const admitted = inspector.optionsInputSchema.parse(input);
  const resolved = inspector.optionsSchema.parse(admitted);
  const frozen = cloneAndFreezeJson(resolved, `${label} options`);
  if (frozen === null || typeof frozen !== 'object' || Array.isArray(frozen)) {
    throw new Error(`${label} options must resolve to a JSON object.`);
  }
  return Object.freeze({ options: frozen as IRJsonObject });
};

/** 求值当前 Composite occurrence 的 inherited 与 self request */
export const resolveCompositeInspection = (
  prepared: PreparedCompileInspection | undefined,
  occurrence: CompileOccurrenceLocator,
  owner: InspectionOwner & Readonly<{ kind: 'composite' }>,
  inspector: (AnyInspectorDefinition & Readonly<{ kind: 'composite' }>) | undefined,
  inherited?: InheritedInspectionState,
  authoredTree?: InspectionAuthoringTree,
): ResolvedInspectionContext => {
  try {
    const context = resolveContext(prepared, occurrence, inherited, authoredTree);
    const self = context.tree?.policy?.self;
    const selected =
      !context.inherited.blocked && self !== false && (self !== undefined || context.inherited.layout !== false);
    if (!selected) return context;
    if (inspector === undefined) {
      if (self !== undefined) throw new Error('Explicit Composite inspection target has no Inspector definition.');
      return context;
    }
    const inheritedInput = context.inherited.layout === false ? {} : context.inherited.layout;
    const input =
      self === undefined || self === true
        ? inheritedInput
        : mergeNestedInput(inheritedInput, validateInputObject(self, 'Composite inspection self'));
    return Object.freeze({ ...context, request: parseRequest(inspector, input, 'Composite Inspector') });
  } catch (cause) {
    throw wrapInspectionError(inspectionOccurrenceResolveOrigin(owner, occurrence), cause);
  }
};

/** 求值当前 Path occurrence 的显式 self request */
export const resolvePathInspection = (
  prepared: PreparedCompileInspection | undefined,
  occurrence: CompileOccurrenceLocator,
  owner: InspectionOwner & Readonly<{ kind: 'pathKind' }>,
  inspector: (AnyInspectorDefinition & Readonly<{ kind: 'path' }>) | undefined,
  inherited?: InheritedInspectionState,
  authoredTree?: InspectionAuthoringTree,
): ResolvedInspectionContext => {
  try {
    const context = resolveContext(prepared, occurrence, inherited, authoredTree);
    const self = context.tree?.policy?.self;
    if (context.inherited.blocked || self === undefined || self === false) return context;
    if (inspector === undefined) throw new Error('Explicit Path inspection target has no Inspector definition.');
    const input = self === true ? {} : validateInputObject(self, 'Path inspection self');
    return Object.freeze({ ...context, request: parseRequest(inspector, input, 'Path Inspector') });
  } catch (cause) {
    throw wrapInspectionError(inspectionOccurrenceResolveOrigin(owner, occurrence), cause);
  }
};

/** 为当前 callback 暴露稳定复用的 opaque inspection child handles */
export const createLayoutCompositeInspectionContext = (
  session: CompositeCompileSession,
  owner: CompositeCompileOwner,
  tree: InspectionAuthoringTree | undefined,
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

import type { IRJsonObject } from '../../schemas';
import type { CompileOccurrenceLocator } from '../occurrence';
import type { InspectOptions } from './options-schema';

/** admission 前可擦除 optional 字段的 inspection options object */
export type InspectionOptionsInputObject = Readonly<Record<string, unknown>>;

/** Scene 根 locator 的首段 */
export type SceneInspectionAuthoringPathSegment = Readonly<{
  kind: 'sceneChild';
  index: number;
}>;

/** Scope child locator 段 */
export type ScopeInspectionAuthoringPathSegment = Readonly<{
  kind: 'scopeChild';
  index: number;
}>;

/** Scene authoring tree 中 Composite occurrence 的 locator */
export type SceneInspectionAuthoringLocator = Readonly<{
  path: readonly [SceneInspectionAuthoringPathSegment, ...Array<ScopeInspectionAuthoringPathSegment>];
}>;

/** layoutChild 相对 authoring tree 中 Composite occurrence 的 locator */
export type ChildInspectionAuthoringLocator = Readonly<{
  path: ReadonlyArray<ScopeInspectionAuthoringPathSegment>;
}>;

/** 单个 Composite occurrence 的 sparse inspection policy */
export type CompositeInspectionAuthoringPolicy<
  TLocal extends InspectionOptionsInputObject = InspectionOptionsInputObject,
> = Readonly<{
  inherited?: InspectOptions;
  component?: boolean | TLocal;
}>;

/** 单个 Composite occurrence 及其 authored children 的 inspection tree */
export type CompositeInspectionAuthoringTree<
  TLocal extends InspectionOptionsInputObject = InspectionOptionsInputObject,
> = Readonly<{
  policy?: CompositeInspectionAuthoringPolicy<TLocal>;
  children?: ReadonlyArray<CompositeInspectionChildForest | null>;
}>;

/** Scene authoring sidecar root */
export type CompositeInspectionAuthoringRoot = Readonly<{
  locator: SceneInspectionAuthoringLocator;
  tree: CompositeInspectionAuthoringTree;
}>;

/** layoutChild authoring sidecar root */
export type CompositeInspectionChildRoot = Readonly<{
  locator: ChildInspectionAuthoringLocator;
  tree: CompositeInspectionAuthoringTree;
}>;

/** 单个 layout child 下的 inspection sidecar forest */
export type CompositeInspectionChildForest = ReadonlyArray<CompositeInspectionChildRoot>;

/** compile 的唯一 inspection sidecar 输入 */
export type CompileInspectionOptions = Readonly<{
  root?: InspectOptions;
  roots?: ReadonlyArray<CompositeInspectionAuthoringRoot>;
}>;

declare const compositeInspectionChildBrand: unique symbol;

/** callback-local、compile-local 的 opaque child inspection handle */
export type CompositeInspectionChild = Readonly<{
  [compositeInspectionChildBrand]: never;
}>;

/** layout-aware composite 可见的 inspection child sidecar */
export type LayoutCompositeInspectionContext = Readonly<{
  child: (index: number) => CompositeInspectionChild | undefined;
}>;

/** Inspector callback 的通用 context */
export type CompositeInspectorContext<TOptions extends IRJsonObject> = Readonly<{
  occurrence: CompileOccurrenceLocator;
  options: TOptions;
}>;

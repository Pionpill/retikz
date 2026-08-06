import type { ZodType } from 'zod';

import type { IRChild, IRJsonObject, JsonValue } from '../../schemas';
import type { CompileOccurrenceLocator } from '../occurrence';
import type { InspectOptions } from './options-schema';

/** Inspector 可返回的普通 Core 子元素 */
export type InspectorOutput = IRChild | ReadonlyArray<IRChild>;

/** Inspector 所依附的 settled subject owner */
export type InspectionOwner =
  | Readonly<{ kind: 'composite'; namespace: string; type: string }>
  | Readonly<{ kind: 'pathKind'; name: string }>;

/** Core 为当前 Inspector occurrence 解析的推荐外观 */
export type InspectionAppearance = Readonly<{
  /** 最终 occurrence 稳定排序后的循环色域序号 */
  colorScope: number;
  /** 当前 occurrence 的推荐常规颜色 */
  scopeColor: string;
  /** 推荐警告颜色 */
  warningColor: string;
}>;

/** Inspector callback 的通用上下文 */
export type InspectorContext<TOptions extends IRJsonObject> = Readonly<{
  /** settled subject 对应的最终 compile occurrence */
  occurrence: CompileOccurrenceLocator;
  /** owner schema 解析后的完整 canonical options */
  options: TOptions;
  /** Core 在 callback 前分配的稳定外观 */
  appearance: InspectionAppearance;
}>;

/** 依附 owner Definition 的 Inspector contract */
export type InspectorDefinition<
  TKind extends string,
  TSubject extends JsonValue,
  TOptionsInput extends IRJsonObject,
  TResolvedOptions extends IRJsonObject,
> = Readonly<{
  /** owner family 内的 Inspector 类别 */
  kind: TKind;
  /** runtime sidecar 的 strict sparse input schema */
  optionsInputSchema: ZodType<TOptionsInput>;
  /** sparse input 到完整 JSON-safe options 的 canonical schema */
  optionsSchema: ZodType<TResolvedOptions, TOptionsInput>;
  /** 把 settled subject 转为一个或多个普通 Core 子元素 */
  inspect: (subject: TSubject, context: InspectorContext<TResolvedOptions>) => InspectorOutput;
}>;

/** registry 擦除后的 Inspector callable boundary */
export type AnyInspectorDefinition = Readonly<{
  /** owner family 内的 Inspector 类别 */
  kind: string;
  /** runtime sidecar 输入 schema */
  optionsInputSchema: { parse: (value: unknown) => unknown };
  /** canonical options schema */
  optionsSchema: { parse: (value: unknown) => unknown };
  /** 只在恢复具体 owner subject 后调用的擦除回调 */
  inspect: (subject: never, context: never) => InspectorOutput;
}>;

/** admission 前可擦除 optional 字段的 inspection options object */
export type InspectionOptionsInputObject = Readonly<Record<string, unknown>>;

/** runtime sidecar 可选择的 Inspector owner 类别 */
export type InspectionAuthoringTargetKind = 'composite' | 'path';

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

/** Scene authoring tree 中 Inspector occurrence 的 locator */
export type SceneInspectionAuthoringLocator = Readonly<{
  /** authored child 必须匹配的 owner 类别 */
  target: InspectionAuthoringTargetKind;
  path: readonly [SceneInspectionAuthoringPathSegment, ...Array<ScopeInspectionAuthoringPathSegment>];
}>;

/** layoutChild 相对 authoring tree 中 Inspector occurrence 的 locator */
export type ChildInspectionAuthoringLocator = Readonly<{
  /** authored child 必须匹配的 owner 类别 */
  target: InspectionAuthoringTargetKind;
  path: ReadonlyArray<ScopeInspectionAuthoringPathSegment>;
}>;

/** 单个 Inspector occurrence 的 sparse authoring policy */
export type InspectionAuthoringPolicy<TLocal extends InspectionOptionsInputObject = InspectionOptionsInputObject> =
  Readonly<{
    inherited?: InspectOptions;
    self?: boolean | TLocal;
  }>;

/** 单个 Inspector occurrence 及其 authored children 的 inspection tree */
export type InspectionAuthoringTree<TLocal extends InspectionOptionsInputObject = InspectionOptionsInputObject> =
  Readonly<{
    policy?: InspectionAuthoringPolicy<TLocal>;
    children?: ReadonlyArray<InspectionChildForest | null>;
  }>;

/** Scene authoring sidecar root */
export type InspectionAuthoringRoot = Readonly<{
  locator: SceneInspectionAuthoringLocator;
  tree: InspectionAuthoringTree;
}>;

/** layoutChild authoring sidecar root */
export type InspectionChildRoot = Readonly<{
  locator: ChildInspectionAuthoringLocator;
  tree: InspectionAuthoringTree;
}>;

/** 单个 layout child 下的 inspection sidecar forest */
export type InspectionChildForest = ReadonlyArray<InspectionChildRoot>;

/** compile 的唯一 inspection sidecar 输入 */
export type CompileInspectionOptions = Readonly<{
  root?: InspectOptions;
  roots?: ReadonlyArray<InspectionAuthoringRoot>;
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

/** 内置 stroke Path Inspector 的开放 runtime authoring options */
export type PathInspectOptions = Readonly<
  {
    /** 是否绘制 quadratic / cubic 控制点与控制柄 */
    controlPoints?: boolean;
    /** 是否绘制控制点标签 */
    labels?: boolean;
  } & Record<string, unknown>
>;

/** 当前 authored Path occurrence 的 Inspector sidecar */
export type PathInspectionAuthoring = boolean | PathInspectOptions;

/** provider 绑定前的 authored locator provenance */
export type InspectionAuthoringDiagnosticLocator =
  | Readonly<{ kind: 'scene'; value: SceneInspectionAuthoringLocator }>
  | Readonly<{ kind: 'child'; value: ChildInspectionAuthoringLocator }>;

/** 编译 warning 与 Inspector error 的结构化来源 */
export type InspectionDiagnosticOrigin =
  | Readonly<{ kind: 'primary' }>
  | Readonly<{
      kind: 'inspection';
      stage: 'resolve';
      site: 'authoring';
      locator: InspectionAuthoringDiagnosticLocator;
    }>
  | Readonly<{
      kind: 'inspection';
      stage: 'resolve';
      site: 'occurrence';
      owner: InspectionOwner;
      occurrence: CompileOccurrenceLocator;
    }>
  | Readonly<{
      kind: 'inspection';
      stage: 'inspect';
      owner: InspectionOwner;
      occurrence: CompileOccurrenceLocator;
    }>
  | Readonly<{
      kind: 'inspection';
      stage: 'output';
      owner: InspectionOwner;
      occurrence: CompileOccurrenceLocator;
      outputIndex: number;
    }>;

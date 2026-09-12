import type {
  CompileObservationOwner,
  CompileOccurrenceLocator,
  CoreSemanticColors,
  CssColorValue,
  IRChild,
} from '@retikz/core';
import type { JsonObject, JsonValue } from '@retikz/foundation';
import type { ZodType } from 'zod';

/** Inspector registry 的公开复合键 */
export type InspectorKey = Readonly<{
  /** Inspector 所属命名空间 */
  namespace: string;
  /** 命名空间内类型 */
  type: string;
}>;

/** Inspector 可返回的普通 Core IR child */
export type InspectorOutput = IRChild | ReadonlyArray<IRChild>;

/** Inspector callback 的稳定外观上下文 */
export type InspectionAppearanceContext = Readonly<{
  /** resolved request 连续序号 */
  colorScope: number;
  /** 由当前 Theme categorical palette 派生的常规颜色 */
  scopeColor: CssColorValue;
  /** 当前 Core Theme 的共享语义颜色 */
  semanticColors: CoreSemanticColors;
}>;

/** Inspector callback 读取的最终 occurrence 上下文 */
export type InspectorContext<TOptions extends JsonObject = JsonObject> = Readonly<{
  /** 当前 Inspector key */
  inspectorKey: InspectorKey;
  /** 当前被观察的 Core owner */
  owner: CompileObservationOwner;
  /** 当前最终 occurrence */
  occurrence: CompileOccurrenceLocator;
  /** probe/replay 来源 */
  provenance: Readonly<{ origin: CompileOccurrenceLocator; final: CompileOccurrenceLocator }>;
  /** canonical JSON-safe options */
  options: TOptions;
  /** callback 前分配的外观上下文 */
  appearance: InspectionAppearanceContext;
}>;

/** 独立于 Core owner Definition 的 Inspector 定义 */
export type InspectorDefinition<
  TSubject extends JsonValue = JsonValue,
  TParsedOptions extends JsonObject = JsonObject,
  TResolvedOptions extends JsonObject = JsonObject,
  TSourceOptions extends JsonObject = TParsedOptions,
> = Readonly<{
  /** registry namespace */
  namespace: string;
  /** registry type */
  type: string;
  /** 被观察的 Core owner */
  owner: CompileObservationOwner;
  /** Core owner output 之后的第二层 subject schema */
  subjectSchema: ZodType<TSubject>;
  /** 唯一 options 契约；合并原始输入后应用默认值与变换 */
  optionsSchema: ZodType<TParsedOptions, TSourceOptions>;
  /** 将 schema 解析后的有效 options 转为 callback 消费态 */
  resolveOptions: (options: TParsedOptions) => TResolvedOptions;
  /** 多层 sparse input 的可选合并规则 */
  mergeOptionsInput?: (inheritedOptionsInput: TSourceOptions, localOptionsInput: TSourceOptions) => TSourceOptions;
  /** 把 settled subject 转为普通 Core IR */
  inspect: (subject: TSubject, context: InspectorContext<TResolvedOptions>) => InspectorOutput;
}>;

/** registry 内擦除具体泛型后的 Inspector 定义 */
export type AnyInspectorDefinition = Readonly<{
  /** registry namespace */
  namespace: string;
  /** registry type */
  type: string;
  /** 被观察的 Core owner */
  owner: CompileObservationOwner;
  /** 擦除后仍恢复 JSON-safe subject */
  subjectSchema: Readonly<{ parse: (value: unknown) => JsonValue }>;
  /** 擦除后仍产出已应用默认值与变换的 JSON object options */
  optionsSchema: Readonly<{ parse: (value: unknown) => JsonObject }>;
  /** 具体 options 类型由准入 schema 恢复 */
  resolveOptions: (options: never) => JsonObject;
  /** 合并已准入的原始 options，不消费 schema 变换后的结果 */
  mergeOptionsInput?: (inheritedOptionsInput: never, localOptionsInput: never) => JsonObject;
  /** 具体 subject/context 类型由调用前的 schema 恢复 */
  inspect: (subject: never, context: never) => InspectorOutput;
}>;

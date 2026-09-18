import type {
  CompileObservationAncestor,
  CompileObservationOwner,
  CompileOccurrenceLocator,
  CoreSemanticColors,
  CssColorValue,
  IRChild,
} from '@retikz/core';
import type { JsonObject, JsonValue, WithOptionalProperties } from '@retikz/foundation';
import type { AffineMatrix } from '@retikz/math';
import type { ZodType } from 'zod';

/** Inspector registry 的公开复合键 */
export type InspectorKey = Readonly<{
  /** Inspector 所属命名空间 */
  namespace: string;
  /** 命名空间内类型 */
  type: string;
}>;

/** Inspector callback 输出所采用的坐标约定 */
export type InspectorCoordinateSpace = 'local' | 'scene';

/** 带显式坐标空间的辅助片段 */
export type InspectorFragment = Readonly<{
  /** 辅助片段判别字段，不属于 Core IR */
  type: 'fragment';
  /** 当前片段采用的坐标空间 */
  coordinateSpace: InspectorCoordinateSpace;
  /** 交给 Core 隔离编译的普通 IR child */
  child: IRChild;
}>;

/** 裸 Core child 使用局部坐标；显式片段可逐项选择坐标空间 */
export type InspectorOutput = IRChild | InspectorFragment | ReadonlyArray<IRChild | InspectorFragment>;

/** Inspector callback 的稳定外观上下文 */
export type InspectionAppearanceContext = Readonly<{
  /** resolved request 连续序号 */
  colorScope: number;
  /** 由当前 Theme categorical palette 派生的常规颜色 */
  scopeColor: CssColorValue;
  /** 当前 Core Theme 的共享语义颜色 */
  semanticColors: CoreSemanticColors;
}>;

/**
 * Inspector callback 读取的最终 occurrence 上下文
 *
 * @template TOptions callback 消费的已解析 options 类型
 */
export type InspectorContext<TOptions extends JsonObject = JsonObject> = Readonly<{
  /** 按本次主图编译精度舍入数值 */
  round: (value: number) => number;
  /** 当前 Inspector key */
  inspectorKey: InspectorKey;
  /** 当前被观察的 Core owner */
  owner: CompileObservationOwner;
  /** 当前最终 occurrence */
  occurrence: CompileOccurrenceLocator;
  /** probe/replay 来源 */
  provenance: Readonly<{ origin: CompileOccurrenceLocator; final: CompileOccurrenceLocator }>;
  /** observation-local 到主 Scene 的最终仿射变换 */
  transform: AffineMatrix;
  /** 从外到内排列的最终逻辑容器链条 */
  ancestors: ReadonlyArray<CompileObservationAncestor>;
  /** canonical JSON-safe options */
  options: TOptions;
  /** callback 前分配的外观上下文 */
  appearance: InspectionAppearanceContext;
  /** 声明当前 callback 可以省略的部分结果 */
  warn: (code: string, message: string) => void;
}>;

/** 独立于 Core owner Definition 的 Inspector 定义 */
export type InspectorDefinition<
  TSubject extends JsonValue = JsonValue,
  TParsedOptions extends JsonObject = JsonObject,
  TResolvedOptions extends JsonObject = JsonObject,
  TSourceOptions extends JsonObject = TParsedOptions,
> = Readonly<{
  /** registry 命名空间 */
  namespace: string;
  /** registry 类型 */
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

/**
 * 作者侧 Inspector 定义；仅在对应输入输出可由默认行为满足时允许省略选项字段
 *
 * @template TSubject 通过 subject schema 解析后的被观察对象类型
 * @template TParsedOptions options schema 解析后的 options 类型
 * @template TResolvedOptions callback 消费的已解析 options 类型
 * @template TSourceOptions 传入 options schema 前的原始 options 输入类型
 */
export type InspectorDefinitionInput<
  TSubject extends JsonValue = JsonValue,
  TParsedOptions extends JsonObject = Record<string, never>,
  TResolvedOptions extends JsonObject = TParsedOptions,
  TSourceOptions extends JsonObject = TParsedOptions,
> = WithOptionalProperties<
  InspectorDefinition<TSubject, TParsedOptions, NoInfer<TResolvedOptions>, TSourceOptions>,
  'optionsSchema' | 'resolveOptions'
> &
  (
    | Readonly<{
        /** 自定义选项的输入与解析输出契约 */
        optionsSchema: ZodType<TParsedOptions, TSourceOptions>;
      }>
    | ([TParsedOptions, TSourceOptions] extends [Record<string, never>, Record<string, never>]
        ? Readonly<{
            /** 无自定义选项时省略，仅接受严格空对象
             * @default z.strictObject({})
             */
            optionsSchema?: never;
          }>
        : never)
  ) &
  (
    | Readonly<{
        /** 将 schema 输出转换为 callback 消费态 */
        resolveOptions: (options: TParsedOptions) => TResolvedOptions;
      }>
    | ([TParsedOptions] extends [TResolvedOptions]
        ? Readonly<{
            /** callback 直接消费 schema 输出时省略
             * @default identity
             */
            resolveOptions?: never;
          }>
        : never)
  );

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

/** registry 接收的异构作者定义，注册时统一补齐选项 schema 与 resolver */
export type AnyInspectorDefinitionInput = WithOptionalProperties<
  AnyInspectorDefinition,
  'optionsSchema' | 'resolveOptions'
>;

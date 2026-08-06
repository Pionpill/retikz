import type {
  CompileObservationOwner,
  CompileOccurrenceLocator,
  CompileResult,
  CompileWarning,
  IRChild,
  IRJsonObject,
  JsonValue,
  Scene,
} from '@retikz/core';
import type { ZodType } from 'zod';

/** Inspector registry 的公开复合键 */
export type InspectorKey = Readonly<{
  /** Inspector 所属命名空间 */
  namespace: string;
  /** 命名空间内名称 */
  name: string;
}>;

/** Inspector 可返回的普通 Core IR child */
export type InspectorOutput = IRChild | ReadonlyArray<IRChild>;

/** Inspector callback 的稳定外观分配 */
export type InspectionAppearance = Readonly<{
  /** resolved request 连续序号 */
  colorScope: number;
  /** 由 canonical palette 派生的常规颜色 */
  scopeColor: string;
  /** canonical warning 颜色 */
  warningColor: string;
}>;

/** Inspector callback 读取的最终 occurrence 上下文 */
export type InspectorContext<TOptions extends IRJsonObject = IRJsonObject> = Readonly<{
  /** 当前 Inspector key */
  inspector: InspectorKey;
  /** 当前被观察的 Core owner */
  owner: CompileObservationOwner;
  /** 当前最终 occurrence */
  occurrence: CompileOccurrenceLocator;
  /** probe/replay 来源 */
  provenance: Readonly<{ origin: CompileOccurrenceLocator; final: CompileOccurrenceLocator }>;
  /** canonical JSON-safe options */
  options: TOptions;
  /** callback 前分配的外观 */
  appearance: InspectionAppearance;
}>;

/** 独立于 Core owner Definition 的 Inspector 定义 */
export type InspectorDefinition<
  TSubject extends JsonValue = JsonValue,
  TOptionsInput extends IRJsonObject = IRJsonObject,
  TResolvedOptions extends IRJsonObject = IRJsonObject,
> = Readonly<{
  /** registry namespace */
  namespace: string;
  /** registry name */
  name: string;
  /** 被观察的 Core owner */
  owner: CompileObservationOwner;
  /** Core owner output 之后的第二层 subject schema */
  subjectSchema: ZodType<TSubject>;
  /** runtime sparse options input schema */
  optionsInputSchema: ZodType<TOptionsInput>;
  /** sparse input 到 canonical options 的 schema */
  optionsSchema: ZodType<TResolvedOptions, TOptionsInput>;
  /** 多层 sparse input 的可选合并规则 */
  mergeOptionsInput?: (inherited: TOptionsInput, local: TOptionsInput) => TOptionsInput;
  /** 把 settled subject 转为普通 Core IR */
  inspect: (subject: TSubject, context: InspectorContext<TResolvedOptions>) => InspectorOutput;
}>;

/** registry 内擦除具体泛型后的 Inspector 定义 */
export type AnyInspectorDefinition = Readonly<{
  /** registry namespace */
  namespace: string;
  /** registry name */
  name: string;
  /** 被观察的 Core owner */
  owner: CompileObservationOwner;
  /** 擦除后仍恢复 JSON-safe subject */
  subjectSchema: Readonly<{ parse: (value: unknown) => JsonValue }>;
  /** 擦除后仍恢复 JSON object input */
  optionsInputSchema: Readonly<{ parse: (value: unknown) => IRJsonObject }>;
  /** 擦除后仍恢复 JSON object options */
  optionsSchema: Readonly<{ parse: (value: unknown) => IRJsonObject }>;
  /** 具体 options 类型由调用前的 schema 恢复 */
  mergeOptionsInput?: (inherited: never, local: never) => IRJsonObject;
  /** 具体 subject/context 类型由调用前的 schema 恢复 */
  inspect: (subject: never, context: never) => InspectorOutput;
}>;

/** Inspector selection 的目标 locator */
export type InspectionSelectionTarget =
  | Readonly<{ kind: 'scene' }>
  | Readonly<{ kind: 'subtree'; sourcePath: string }>
  | Readonly<{
      kind: 'self';
      locator:
        | Readonly<{
            kind: 'authored';
            sourcePath: string;
            /** 同一来源路径与所属者下按最终实例顺序选择的序号；省略表示全部 */
            occurrenceIndex?: number;
          }>
        | Readonly<{ kind: 'occurrence'; occurrence: CompileOccurrenceLocator }>;
    }>;

/** Inspector selection 的 request 或全 Inspector barrier */
export type InspectionSelectionRule =
  | Readonly<{
      kind: 'request';
      inspector: InspectorKey;
      target: InspectionSelectionTarget;
      value: false | true | IRJsonObject;
    }>
  | Readonly<{
      kind: 'barrier';
      target: Extract<InspectionSelectionTarget, { kind: 'scene' | 'subtree' }>;
    }>;

/** 一次 compile 的 runtime-only Inspector selection */
export type InspectionSelection = Readonly<{
  /** 完整 admission 后参与级联的规则 */
  rules: ReadonlyArray<InspectionSelectionRule>;
}>;

/** selection 解析出的 canonical request */
export type ResolvedInspectionRequest = Readonly<{
  /** Inspector key */
  inspector: InspectorKey;
  /** 实际 owner */
  owner: CompileObservationOwner;
  /** 最终 occurrence */
  occurrence: CompileOccurrenceLocator;
  /** probe/replay 来源 */
  provenance: Readonly<{ origin: CompileOccurrenceLocator; final: CompileOccurrenceLocator }>;
  /** canonical options */
  options: IRJsonObject;
  /** 连续分配的 appearance */
  appearance: InspectionAppearance;
}>;

/** 一个辅助 Scene plane entry */
export type InspectionPlaneEntry = Readonly<{
  /** 生成该 entry 的 Inspector */
  inspector: InspectorKey;
  /** 被观察 owner */
  owner: CompileObservationOwner;
  /** 最终 occurrence */
  occurrence: CompileOccurrenceLocator;
  /** request 级连续颜色序号 */
  colorScope: number;
  /** occurrence-local sealed Scene */
  scene: Scene;
  /** occurrence local 到 primary Scene 的矩阵 */
  transform: readonly [number, number, number, number, number, number];
}>;

/** 有序、只读的 Inspector 辅助平面 */
export type InspectionPlane = Readonly<{
  /** 与 callback 非空 outputs 一一对应的 entries */
  entries: ReadonlyArray<InspectionPlaneEntry>;
}>;

/** Inspect fail-loud 错误及非致命 fragment diagnostic 的结构化来源 */
export type InspectionDiagnosticOrigin =
  | Readonly<{ stage: 'selection'; ruleIndex: number; target: InspectionSelectionTarget }>
  | Readonly<{
      stage: 'subject' | 'inspect';
      inspector: InspectorKey;
      owner: CompileObservationOwner;
      occurrence: CompileOccurrenceLocator;
    }>
  | Readonly<{
      stage: 'output' | 'fragment';
      inspector: InspectorKey;
      owner: CompileObservationOwner;
      occurrence: CompileOccurrenceLocator;
      outputIndex: number;
    }>
  | Readonly<{ stage: 'complete' }>;

/** 一个 fragment warning 的 Inspect-owned diagnostic */
export type InspectionDiagnostic = Readonly<{
  /** warning 对应的 request 与 output */
  origin: InspectionDiagnosticOrigin;
  /** Core code/message/path 原样投影 */
  cause: Readonly<Pick<CompileWarning, 'code' | 'message' | 'path'>>;
}>;

/** primary 与辅助结果的原子 compile 输出 */
export type InspectionCompileResult = Readonly<{
  /** 普通 Core compile 的 primary */
  primary: CompileResult;
  /** 全部 callback 无输出时为 null */
  inspection: InspectionPlane | null;
  /** 仅包含 fragment warnings */
  diagnostics: ReadonlyArray<InspectionDiagnostic>;
}>;

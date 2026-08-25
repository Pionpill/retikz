import type {
  CompileObservationOwner,
  CompileOccurrenceLocator,
  CompileResult,
  CompileWarning,
  IRJsonObject,
  Scene,
} from '@retikz/core';
import type { AffineMatrix } from '@retikz/math';

import type { InspectorKey } from '../contract';

/** Inspector selection 的目标 locator */
export type InspectionSelectionTarget =
  | Readonly<{ kind: 'scene' }>
  | Readonly<{ kind: 'subtree'; sourcePath: string }>
  | Readonly<{
      kind: 'self';
      locator:
        | Readonly<{
            /** 按 authored source path 选择其产生的最终 occurrence */
            kind: 'authored';
            /** authored IR 中的稳定来源路径 */
            sourcePath: string;
            /** 同一来源路径与所属者下按最终实例顺序选择的序号；省略表示全部 */
            occurrenceIndex?: number;
          }>
        | Readonly<{
            /** 精确选择一个最终编译 occurrence */
            kind: 'occurrence';
            /** Core 提供的最终 occurrence 定位器 */
            occurrence: CompileOccurrenceLocator;
          }>;
    }>;

/** Inspector selection 的单条规则：request 控制单个 Inspector，barrier 封锁一个范围内的全部 Inspector */
export type InspectionSelectionRule =
  | Readonly<{
      /** 针对指定 Inspector 的启用、关闭或 options 请求 */
      kind: 'request';
      /** 要操作的 Inspector key */
      inspector: InspectorKey;
      /** 请求生效的 scene、subtree 或 self 范围 */
      target: InspectionSelectionTarget;
      /** false 关闭该 Inspector，true 使用默认 options，对象提供 sparse options */
      options: boolean | IRJsonObject;
    }>
  | Readonly<{
      /** 封锁目标范围内的全部 Inspector，并阻止后代规则重新开启 */
      kind: 'barrier';
      /** 只能作用于整张 scene 或 subtree 的封锁范围 */
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
  /** request 级连续颜色序号 */
  colorScope: number;
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
  transform: AffineMatrix;
}>;

/** 有序、只读的 Inspector 辅助平面 */
export type InspectionPlane = Readonly<{
  /** 与 callback 非空 outputs 一一对应的 entries */
  entries: ReadonlyArray<InspectionPlaneEntry>;
}>;

/** Inspect fail-loud 错误及非致命 fragment diagnostic 的结构化来源 */
export type InspectionDiagnosticOrigin =
  | Readonly<{ stage: 'selection'; ruleIndex: number; target: InspectionSelectionTarget | null }>
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

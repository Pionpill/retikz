import type {
  CompileObservationOwner,
  CompileOccurrenceLocator,
  CompileResult,
  CompileWarning,
  Scene,
} from '@retikz/core';
import type { JsonObject } from '@retikz/foundation';
import type { AffineMatrix } from '@retikz/math';

import type { InspectorKey } from '../contract';

/** Inspector selection 的目标 locator */
export type InspectionSelectionTarget =
  | Readonly<{
      /** 选择整张主图 */
      kind: 'scene';
    }>
  | Readonly<{
      /** 选择指定来源的子树 */
      kind: 'subtree';
      /** 目标 Scope 在 Source IR 中的路径 */
      sourcePath: string;
    }>
  | Readonly<{
      /** 仅选择来源对应的最终实例 */
      kind: 'self';
      /** 按来源路径定位实例；occurrenceIndex 省略时选择该来源与所属者下的全部实例 */
      locator: Readonly<{
        /** 按 authored source path 选择其产生的最终 occurrence */
        kind: 'authored';
        /** authored IR 中的稳定来源路径 */
        sourcePath: string;
        /** 同一来源路径与所属者下按最终实例顺序选择的序号；省略表示全部 */
        occurrenceIndex?: number;
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
      options: boolean | JsonObject;
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
  options: JsonObject;
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
  /** 按辅助片段 coordinateSpace 生成的只读 Scene */
  scene: Scene;
  /** 辅助 Scene 到 primary Scene 的矩阵；scene 模式为单位矩阵 */
  transform: AffineMatrix;
}>;

/** 有序、只读的 Inspector 辅助平面 */
export type InspectionPlane = Readonly<{
  /** 与 callback 非空 outputs 一一对应的 entries */
  entries: ReadonlyArray<InspectionPlaneEntry>;
}>;

/** Inspect 失败、回调警告及 fragment diagnostic 的结构化来源 */
export type InspectionDiagnosticOrigin =
  | Readonly<{
      /** 选择规则准入或匹配阶段 */
      stage: 'selection';
      /** 失败规则在 rules 中的零基索引 */
      ruleIndex: number;
      /** 已识别的目标；目标无效或不可恢复时为 null */
      target: InspectionSelectionTarget | null;
    }>
  | Readonly<{
      /** 被观察对象解析或 Inspector 回调阶段 */
      stage: 'subject' | 'inspect';
      /** 产生当前诊断的 Inspector 键 */
      inspector: InspectorKey;
      /** 被观察实例的所属者 */
      owner: CompileObservationOwner;
      /** 产生诊断的最终实例定位信息 */
      occurrence: CompileOccurrenceLocator;
    }>
  | Readonly<{
      /** 回调输出准入或辅助片段编译阶段 */
      stage: 'output' | 'fragment';
      /** 产生当前诊断的 Inspector 键 */
      inspector: InspectorKey;
      /** 被观察实例的所属者 */
      owner: CompileObservationOwner;
      /** 产生诊断的最终实例定位信息 */
      occurrence: CompileOccurrenceLocator;
      /** 回调输出中的零基序号 */
      outputIndex: number;
    }>
  | Readonly<{
      /** 辅助观测结果汇总阶段 */
      stage: 'complete';
    }>;

/** 一条回调或 fragment warning 的 Inspect-owned diagnostic */
export type InspectionDiagnostic = Readonly<{
  /** warning 对应的 request 与 output */
  origin: InspectionDiagnosticOrigin;
  /** 回调 code/message 与来源路径，或 Core warning 的原样投影 */
  cause: Readonly<Pick<CompileWarning, 'code' | 'message' | 'path'>>;
}>;

/** primary 与辅助结果的原子 compile 输出 */
export type InspectionCompileResult = Readonly<{
  /** 普通 Core compile 的 primary */
  primary: CompileResult;
  /** 全部 callback 无输出时为 null */
  inspection: InspectionPlane | null;
  /** 按请求顺序排列的回调警告与 fragment warnings */
  diagnostics: ReadonlyArray<InspectionDiagnostic>;
}>;

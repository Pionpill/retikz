import type {
  AnyCompositeDefinition,
  CompileArtifact,
  CompileOptions,
  CompileResult,
  IRScene,
  Scene,
} from '@retikz/core';
import type { RenderReadonlyLayer } from '@retikz/render/runtime';
import type { RuntimeUpdateStrategyValue } from '@retikz/runtime';

import type { InputAuthoringSite, InputNormalizeOptions, InputRuntimeMeta, InputScene } from '../normalize';
import type { VanillaCompileDriver } from '../runtime/compile-driver';

/** 可进入 Vanilla 框架无关 processing 的作者输入 */
export type ProcessingSource = InputScene | IRScene;

/** 创建 processing controller 时固定的框架无关配置 */
export type ProcessingOptions = Readonly<{
  /** Core 编译配置 */
  compile?: CompileOptions;
  /** 作者侧 Tier 2 adapter */
  adapters?: InputNormalizeOptions['adapters'];
  /** 领域中立的同 revision compile observer driver */
  compileDriver?: VanillaCompileDriver;
  /** Core Program 的 retained 更新策略 */
  updateStrategy?: RuntimeUpdateStrategyValue;
}>;

/** 已完成作者侧归一与 Composite dependency 解析的 processing 输入 */
export type PreparedProcessingInput = Readonly<{
  /** 直接交给 Core compile 的 Source IR */
  source: IRScene;
  /** 与 Source IR 同次确定的 Core compile options */
  coreOptions: CompileOptions<ReadonlyArray<AnyCompositeDefinition>>;
  /** 归一化时收集的作者来源 */
  authoringSites: ReadonlyArray<InputAuthoringSite>;
  /** 归一化时生成的 runtime metadata */
  runtimeMeta: InputRuntimeMeta;
}>;

/** 一次成功 processing 编译得到的不可变结果 */
export type ProcessingResult = Readonly<{
  /** controller 内单调递增的 committed revision */
  revision: number;
  /** 同 revision 的 Scene */
  scene: Scene;
  /** authored source 的完整 Core compile result */
  compileResult: CompileResult;
  /** 与 Scene 同 revision 的 artifacts */
  artifacts: ReadonlyArray<CompileArtifact>;
  /** compile driver 产生的只读图层 */
  layers: ReadonlyArray<RenderReadonlyLayer>;
  /** processing 收集的诊断 */
  diagnostics: ReadonlyArray<unknown>;
  /** framework-neutral runtime metadata */
  runtimeMeta: InputRuntimeMeta;
}>;

/** framework-neutral retained processing controller */
export type ProcessingController = Readonly<{
  /** 原子提交下一份 InputScene 或已归一的 IRScene */
  update: (source: ProcessingSource) => void;
  /** 读取最后一次成功提交的结果 */
  read: () => ProcessingResult;
  /** 订阅后续成功提交，返回取消订阅函数 */
  subscribe: (listener: (result: ProcessingResult) => void) => () => void;
  /** 读取并清空 processing 与 Runtime 诊断 */
  diagnostics: () => ReadonlyArray<unknown>;
  /** 释放 controller，之后禁止更新与订阅 */
  dispose: () => void;
}>;

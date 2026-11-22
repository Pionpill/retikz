import type { AnyCompositeDefinition, IRScene } from '@retikz/core';
import type { CompileOptions } from '@retikz/reconciler';

import type { InputAuthoringSite, LayerOptions, InputScene, InputSceneChildren } from '../../normalize';
import type { VanillaCompileResultExtension } from '../compile';

/** 可进入 Vanilla 框架无关 processing 的作者输入 */
export type ProcessingSource = InputScene | IRScene;

/** 单图作者输入或其持久化 IR */
export type SingleSceneSource = InputSceneChildren | IRScene;

/** 由调用方在 controller 生命周期内保持稳定的框架无关配置 */
export type ProcessingOptions = LayerOptions &
  Readonly<{
    /** 领域中立的同 revision 编译结果扩展 */
    compileResultExtension?: VanillaCompileResultExtension;
  }>;

/** 已完成作者侧归一与 Composite dependency 解析的 processing 输入 */
export type InputPreparedProcessing = Readonly<{
  /** 直接交给 Core compile 的 Source IR */
  source: IRScene;
  /** 与 Source IR 同次确定的 Core compile options */
  coreOptions: CompileOptions<AnyCompositeDefinition>;
  /** 归一化时收集的作者来源 */
  authoringSites: ReadonlyArray<InputAuthoringSite>;
}>;

/** 异步作者准备配置；只接受已声明 prepare 能力的 adapter */
export type AsyncProcessingOptions = ProcessingOptions &
  Readonly<{
    /** 单次静态请求或 controller 生命周期取消信号 */
    signal?: AbortSignal;
  }>;

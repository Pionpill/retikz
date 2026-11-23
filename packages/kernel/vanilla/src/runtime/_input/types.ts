import type { AnyCompositeDefinition, IRScene } from '@retikz/core';
import type { CompileOptions } from '@retikz/reconciler';

import type { InputAuthoringSite, LayerOptions } from '../../normalize';
import type { VanillaCompileResultExtension } from '../compile';

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

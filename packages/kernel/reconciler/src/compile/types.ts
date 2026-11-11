import type { AnyCompositeDefinition, CompileWarning, CompositeInputBindings, Scene } from '@retikz/core';

import type { CompileHostOptions, CompileLayoutOptions, CompileProviderOptions } from './options';
import type { CompileProvenanceSnapshot } from './provenance';
import type { CompositeArtifact, CompositeArtifactOf } from './shared';

/**
 * `compileToScene()` 的显式 Scene + artifact 结果
 * @template TCompositeArtifact 本次编译可返回的复合组件产物联合
 */
export type CompileResult<TCompositeArtifact extends CompositeArtifact = CompositeArtifact> = Readonly<{
  /** 可由渲染器直接消费的完整场景 */
  scene: Scene;
  /** 本次编译收集的复合组件产物 */
  artifacts: ReadonlyArray<TCompositeArtifact>;
}>;

/**
 * Tier 2 composite 展开选项
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export type CompileCompositeOptions<
  TComposites extends ReadonlyArray<AnyCompositeDefinition> = ReadonlyArray<AnyCompositeDefinition>,
> = {
  /** 与本次完整 Source 配对的 composite 实例运行时输入 */
  compositeInputs?: CompositeInputBindings;
  /**
   * 运行时注入的 Tier 2 composite 展开逻辑
   * @description Core 不预留官方 namespace 名称；未注册的 namespace/type 会触发 warning，并跳过该 composite 节点，重复的完整 namespace/type 键在注册期报错
   * @default []
   */
  composites?: TComposites;
  /**
   * composite 嵌套展开的最大深度
   * @description 必须是非负安全整数；零禁止展开 composite，超限或环会 throw
   * @default DEFAULT_MAX_COMPOSITE_DEPTH
   */
  maxCompositeDepth?: number;
};

/**
 * compileToScene 的可选参数
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export type CompileOptions<
  TComposites extends ReadonlyArray<AnyCompositeDefinition> = ReadonlyArray<AnyCompositeDefinition>,
> = CompileHostOptions &
  CompileLayoutOptions &
  CompileProviderOptions &
  CompileCompositeOptions<TComposites> & {
    /**
     * 单次裁剪转换允许访问的声明数量，包含根声明及递归子声明
     * @default 32
     */
    maxClipDepth?: number;
  };

/**
 * 单次静态编译的产物、诊断与可选来源信息
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export type SceneCompilationSnapshot<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  /** 完整 compile result */
  result: CompileResult<CompositeArtifactOf<TComposites[number]>>;
  /** 仅在完整 compile 成功后可提交的 canonical warnings */
  diagnostics: ReadonlyArray<CompileWarning>;
  /** 按需收集的编译来源信息 */
  provenance?: CompileProvenanceSnapshot;
}>;

/** 编译执行时的运行配置项 */
export type ExecuteOptions = Readonly<{
  /** 是否收集编译来源信息，默认不收集 */
  captureProvenance?: boolean;
}>;

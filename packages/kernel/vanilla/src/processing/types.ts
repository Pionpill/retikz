import type { AnyCompositeDefinition, IRScene, Scene } from '@retikz/core';
import type { CompileOptions, CompileResult, CompositeArtifact, WeaveBatch } from '@retikz/reconciler';
import type { RenderReadonlyLayer } from '@retikz/render/runtime';

import type {
  AnyInputEmbedAdapter,
  InputAuthoringSite,
  LayerOptions,
  InputNormalizeOptions,
  InputScene,
  InputSceneChildren,
  InputLayer,
  InputSceneLayers,
  LayerName,
  NamedLayerResult,
} from '../normalize';
import type { VanillaCompileDriver } from './compile-driver';

/** 可进入 Vanilla 框架无关 processing 的作者输入 */
export type ProcessingSource = InputScene | IRScene;

/** 单图作者输入或其持久化 IR */
export type SingleSceneSource = InputSceneChildren | IRScene;

/** 创建 processing controller 时固定的框架无关配置 */
export type ProcessingOptions = LayerOptions &
  Readonly<{
    /** 文字未指定字体族时的宿主默认字体，同时用于测量与宿主显示 */
    defaultFontFamily?: string;
    /** 作者侧 Tier 2 adapter */
    adapters?: InputNormalizeOptions['adapters'];
    /** 领域中立的同 revision compile observer driver */
    compileDriver?: VanillaCompileDriver;
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

/** 一次成功 processing 编译得到的不可变结果 */
export type ProcessingResult = Readonly<{
  /** controller 内单调递增的 committed revision */
  revision: number;
  /** 同 revision 的 Scene */
  scene: Scene;
  /** authored source 的完整 Core compile result */
  compileResult: CompileResult;
  /** 与 Scene 同 revision 的 artifacts */
  artifacts: ReadonlyArray<CompositeArtifact>;
  /** compile driver 产生的只读图层 */
  layers: ReadonlyArray<RenderReadonlyLayer>;
  /** processing 收集的诊断 */
  diagnostics: ReadonlyArray<unknown>;
}>;

/** 视口按层序发布的完整结果，各层保留自己的编译结果 */
export type LayerProcessingResult = ReadonlyArray<NamedLayerResult<ProcessingResult>>;

/** 显式层栈的计算控制器；批次依赖本层此前交付的结果 */
export type LayerProcessingController = Readonly<{
  read: () => LayerProcessingResult;
  update: (source: InputSceneLayers) => void;
  replaceLayer: (layer: InputLayer) => void;
  /** 从本层已提交结果取得批次地址；不能跨会话或版本使用 */
  getScopeId: (name: LayerName, path: ReadonlyArray<number>, expected: ProcessingResult) => string;
  updateLayer: (name: LayerName, batch: WeaveBatch, expected: ProcessingResult) => void;
  setLayerOrder: (name: LayerName, zIndex: number) => void;
  removeLayer: (name: LayerName) => void;
  subscribe: (listener: (result: LayerProcessingResult) => void) => () => void;
  diagnostics: () => ReadonlyArray<unknown>;
  dispose: () => void;
}>;

/** 不绑定框架的保留式处理控制器 */
export type ProcessingController = Readonly<{
  /** 原子提交下一份 InputScene 或已归一的 IRScene */
  update: (source: SingleSceneSource) => void;
  /** 读取最后一次成功提交的结果 */
  read: () => ProcessingResult;
  /** 订阅后续成功提交，返回取消订阅函数 */
  subscribe: (listener: (result: ProcessingResult) => void) => () => void;
  /** 读取并清空 processing 与 Runtime 诊断 */
  diagnostics: () => ReadonlyArray<unknown>;
  /** 释放 controller，之后禁止更新与订阅 */
  dispose: () => void;
}>;

/** 异步作者准备配置；只接受已声明 prepare 能力的 adapter */
export type AsyncProcessingOptions = Readonly<Omit<ProcessingOptions, 'adapters'>> &
  Readonly<{
    /** 命名领域 adapter */
    adapters?: ReadonlyArray<AnyInputEmbedAdapter & Required<Pick<AnyInputEmbedAdapter, 'prepare'>>>;
    /** 单次静态请求或 controller 生命周期取消信号 */
    signal?: AbortSignal;
  }>;

/** 同步编译结束后的完整候选，其提交与丢弃互斥 */
export type PreparedAsyncStaticProcessing<TResult = ProcessingResult> = Readonly<{
  /** 同 revision 的不可变结果 */
  result: TResult;
  /** 原子发布一次；重复提交无副作用 */
  commit: () => void;
  /** 放弃候选；重复丢弃无副作用 */
  discard: () => void;
}>;

/** 单次作者更新最终是否仍拥有发布权 */
export type ProcessingUpdateOutcome =
  | Readonly<{
      /** 更新已提交或被后续请求取代的结果判别 */
      kind: 'committed';
      /** 本次成功提交后可见的完整处理结果 */
      result: ProcessingResult;
    }>
  | Readonly<{
      /** 更新已提交或被后续请求取代的结果判别 */
      kind: 'superseded';
    }>;

/** 异步准备后复用唯一的同步 retained 提交 */
export type AsyncProcessingController = Readonly<Omit<ProcessingController, 'update'>> &
  Readonly<{
    /** 到达时立即使更早的准备请求失效 */
    update: (source: SingleSceneSource) => Promise<ProcessingUpdateOutcome>;
  }>;

/** 允许作者贡献异步就绪的具名层控制器 */
export type AsyncLayerProcessingController = Omit<LayerProcessingController, 'update' | 'replaceLayer'> & {
  update: (source: InputSceneLayers) => Promise<LayerProcessingUpdateOutcome>;
  replaceLayer: (layer: InputLayer) => Promise<LayerProcessingUpdateOutcome>;
};
/** 只有仍持有发布权的请求返回结果 */
export type LayerProcessingUpdateOutcome =
  | { kind: 'committed'; result: LayerProcessingResult }
  | { kind: 'superseded' };

import type { JsonValue } from '@retikz/foundation';
import type { RuntimeTraceReporter } from '@retikz/runtime';
import type { ZodType } from 'zod';

import type {
  AnyCompositeDefinition,
  CompileObserverOutput,
  CompileOccurrenceLocator,
  CompositeInputBindings,
  Scene,
  SpatialHandleIndex,
} from '../contract';
import type { CoreProviderDefinitions, ThemeStyleDefinition } from '../contract';
import type { IRCoordinate, IRNode, IRPathBase, IRScene, IRScope } from '../schemas';
import type { LowerTex, TextMeasurer } from './text';
import type { CompileWarning } from './warning';

/** 编译期节点布局观测结果 */
export type CompiledNodeLayout = {
  /** 布局对象类型 */
  kind: 'node';
  /** 节点 id */
  id?: string;
  /** 节点正文内容盒测量 */
  content: {
    /** 内容盒中心点，已应用当前 scope transform */
    center: [number, number];
    /** 内容盒在节点排版轴上的尺寸 */
    size: {
      /** 内容盒宽度 */
      width: number;
      /** 内容盒高度 */
      height: number;
    };
    /** 内容盒四角经过当前 scope transform 后得到的全局 AABB */
    bounds: {
      /** AABB 左上角 x */
      x: number;
      /** AABB 左上角 y */
      y: number;
      /** AABB 宽度 */
      width: number;
      /** AABB 高度 */
      height: number;
    };
  };
  /** 节点视觉外框布局结果 */
  rect: {
    /** 外框中心 x */
    x: number;
    /** 外框中心 y */
    y: number;
    /** 外框宽度 */
    width: number;
    /** 外框高度 */
    height: number;
    /** 旋转角，单位为弧度 */
    rotate: number;
  };
  /** 节点正文文本布局摘要 */
  text: {
    /** 本次布局是否产出 TeX glyph */
    hasInlineTex: boolean;
    /** 正文行数 */
    lineCount: number;
  };
};

/**
 * layout-aware composite 返回的显式领域产物
 * @template TNamespace 产生该产物的复合组件命名空间
 * @template TType 产生该产物的复合组件类型标识
 * @template TValue 由复合组件产物 schema 校验的 JSON 值类型
 */
export type CompositeCompileArtifact<
  TNamespace extends string = string,
  TType extends string = string,
  TValue extends JsonValue = JsonValue,
> = Readonly<{
  /** 标识复合组件领域产物 */
  kind: 'composite';
  /** 产物所属复合组件的注册命名空间 */
  namespace: TNamespace;
  /** 产物所属复合组件的注册类型 */
  type: TType;
  /** 产生该产物的最终编译出现位置 */
  occurrence: CompileOccurrenceLocator;
  /** 通过组件产物 schema 校验的领域结果 */
  value: TValue;
}>;

/** 真实 Node 的 opt-in 布局产物 */
export type NodeLayoutCompileArtifact = Readonly<{
  /** 标识真实节点的布局观测产物 */
  kind: 'nodeLayout';
  /** 被观测节点的最终编译出现位置 */
  occurrence: CompileOccurrenceLocator;
  /** 节点的正文测量、视觉外框及文本布局结果 */
  value: CompiledNodeLayout;
}>;

/** compile 返回的通用 artifact envelope */
export type CompileArtifact = CompositeCompileArtifact | NodeLayoutCompileArtifact;

/** compile artifact 开关 */
export type CompileArtifactOptions = Readonly<{
  /** 是否返回真实 Node 的布局 DTO */
  nodeLayouts?: boolean;
}>;

/**
 * `compileToScene()` 的显式 Scene + artifact 结果
 * @template TCompositeArtifact 本次编译可返回的复合组件产物联合
 */
export type CompileResult<TCompositeArtifact extends CompositeCompileArtifact = CompositeCompileArtifact> = Readonly<{
  /** 可由渲染器直接消费的完整场景 */
  scene: Scene;
  /** 本次编译收集的复合组件产物及显式请求的节点布局产物 */
  artifacts: ReadonlyArray<TCompositeArtifact | NodeLayoutCompileArtifact>;
  /** 与 Scene / artifacts 同 revision 的 renderer-neutral world-space 空间索引 */
  spatialHandles: SpatialHandleIndex;
}>;

/**
 * 显式 observed compile 的主结果与 observer outputs
 * @template TOutput 观察会话完成时产生的结果类型
 */
export type ObservedCompileResult<TOutput = unknown> = Readonly<{
  /** 与普通 compile 等价的 primary result */
  primary: CompileResult;
  /** 按 observer definitions 输入顺序排列的输出 */
  observerOutputs: ReadonlyArray<CompileObserverOutput<TOutput>>;
}>;

/**
 * 从精确 composite definition 推导 artifact envelope
 * @template TDefinition 用于推导命名空间、类型标识与产物值的复合组件定义
 */
export type CompositeArtifactOf<TDefinition> = TDefinition extends {
  namespace: infer TNamespace extends string;
  type: infer TType extends string;
  artifactSchema: ZodType<infer TArtifact extends JsonValue>;
}
  ? CompositeCompileArtifact<TNamespace, TType, TArtifact>
  : never;

/** 宿主环境注入的 compile 能力 */
export type CompileHostOptions = {
  /**
   * 注入文字度量函数
   * @default fallbackMeasurer
   */
  measureText?: TextMeasurer;
  /**
   * 运行时注入的公式渲染能力
   * @description 带 tex 内容但未注入或解析失败时会 warning 并降级
   */
  lowerTex?: LowerTex;
  /**
   * 编译期警告收集器
   * @description path / position 解析失败时按 IR locator + code + message 同步触发
   * @default defaultWarnDispatcher
   */
  onWarn?: (warning: CompileWarning) => void;
};

/** 自动布局与 Scene 输出口径 */
export type CompileLayoutOptions = {
  /**
   * layout 周围的留白
   * @default DEFAULT_LAYOUT_PADDING (10)
   */
  padding?: number;
  /**
   * 输出坐标的小数位精度
   * @description 仅作用于 Scene 输出；内部几何保持 double 精度
   * @default DEFAULT_PRECISION (2)
   */
  precision?: number;
  /**
   * 相对定位距离
   * @description `Node.position` 为 `{ direction, of }` 且未自带 `distance` 时取此值
   * @default DEFAULT_NODE_DISTANCE (24)
   */
  nodeDistance?: number;
  /**
   * 节点 label 视觉盒与节点边界的默认净距
   * @description `Node.label.distance` 未设置时取此值，必须是 finite nonnegative number
   * @default DEFAULT_LABEL_DISTANCE (12)
   */
  labelDistance?: number;
  /**
   * 默认字号
   * @description `font.size` 缺省时使用此值；同时作为字号 preset 与 `rem` 的根字号。不改变显式数字字号
   * @default DEFAULT_FONT_SIZE (16)
   */
  fontSize?: number;
};

/** 运行时注入的 provider 注册表 */
export type CompileProviderOptions = Omit<CoreProviderDefinitions, 'composites'> & {
  /** 运行时注入的 Core Theme style definitions */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
};

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
   * @description 超限或环会 throw
   * @default DEFAULT_MAX_COMPOSITE_DEPTH
   */
  maxCompositeDepth?: number;
};

/** composite 已全部展开后的 Tier 1 scope */
export type LoweredIRScope = Omit<IRScope, 'children'> & {
  /** 只包含 Tier 1 的递归子节点 */
  children: Array<LoweredIRChild>;
};

/** composite 已全部展开后的 Tier 1 child */
export type LoweredIRChild = IRNode | IRPathBase | IRCoordinate | LoweredIRScope;

/** 可由 Kernel adapter 直接消费的 Tier 1 IR scene */
export type LoweredIRScene = Omit<IRScene, 'children'> & {
  /** 只包含 Tier 1 的顶层子节点 */
  children: Array<LoweredIRChild>;
};

/** `lowerIRToKernel` 使用的 composite Definition 与深度选项 */
export type LowerIRToKernelOptions = Pick<
  CompileCompositeOptions,
  'composites' | 'maxCompositeDepth' | 'compositeInputs'
> &
  Pick<CompileProviderOptions, 'themeStyles'>;

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
     * Clip resolve 与 ClipShape lower 共用的最大边数
     * @default 32
     */
    maxClipDepth?: number;
    /** 本次 compile 请求的 opt-in artifacts */
    artifacts?: CompileArtifactOptions;
    /** 记录本次 full compile 的确定性 IRChild dispatch 工作量 */
    trace?: RuntimeTraceReporter<'@retikz/core'>;
  };

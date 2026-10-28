import type { JsonValue } from '@retikz/foundation';
import type { ZodType } from 'zod';

import type {
  AnyCompositeDefinition,
  CompileOccurrenceLocator,
  CompositeInputBindings,
  CoreProviderDefinitions,
  Scene,
  ThemeDefinition,
} from '../contract';
import type { TexLowerer, TextMeasurer } from './text';
import type { CompileWarning } from './warning';

/**
 * layout-aware composite 返回的显式领域产物
 * @template TNamespace 产生该产物的复合组件命名空间
 * @template TType 产生该产物的复合组件类型标识
 * @template TValue 复合组件声明的 JSON 值类型
 */
export type CompositeArtifact<
  TNamespace extends string = string,
  TType extends string = string,
  TValue extends JsonValue = JsonValue,
> = Readonly<{
  /** 产物所属复合组件的注册命名空间 */
  namespace: TNamespace;
  /** 产物所属复合组件的注册类型 */
  type: TType;
  /** 产生该产物的最终编译出现位置 */
  occurrence: CompileOccurrenceLocator;
  /** 组件声明的领域结果 */
  value: TValue;
}>;

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
 * 从精确 composite definition 推导 artifact envelope
 * @template TDefinition 用于推导命名空间、类型标识与产物值的复合组件定义
 */
export type CompositeArtifactOf<TDefinition> = TDefinition extends {
  namespace: infer TNamespace extends string;
  type: infer TType extends string;
  artifactSchema: ZodType<infer TArtifact extends JsonValue>;
}
  ? CompositeArtifact<TNamespace, TType, TArtifact>
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
  lowerTex?: TexLowerer;
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
  /** 运行时注入的 Core Theme definitions */
  themeDefinitions?: ReadonlyArray<ThemeDefinition>;
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

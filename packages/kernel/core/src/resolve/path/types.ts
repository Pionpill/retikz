import type {
  AnyPathKindDefinition,
  ArrowDefinition,
  PathGeneratorDefinition,
  PatternDefinition,
  RibbonWidthProfileDefinition,
  Transform,
} from '../../contract';
import type {
  IRArrowMark,
  IRGeometryLabel,
  IRJsonObject,
  IRPathBase,
  IRPathRibbonOptions,
  IRPosition,
  IRRibbonSampling,
  IRRibbonWidth,
  IRStep,
  IRTarget,
  ResolvedDropShadow,
} from '../../schemas';
import type { BoundaryReferenceResolution, NodeReferenceView } from '../node';
import type { PaintResolutionInput } from '../resource';
import type { StyleResolveFrame } from '../style';

/** 展开位置、方向与距离默认值后的路径几何标签 */
export type CanonicalGeometryLabel = Omit<IRGeometryLabel, 'position' | 'side' | 'distance'> & {
  /** 路径上的归一化位置 */
  position: number;
  /** 相对宿主线段的方向 */
  side: NonNullable<IRGeometryLabel['side']> | 'center';
  /** 相对宿主线的偏移距离 */
  distance: number;
};

type WithCanonicalStepLabel<TStep extends IRStep> = TStep extends unknown
  ? 'label' extends keyof TStep
    ? Omit<TStep, 'label'> & { label?: CanonicalGeometryLabel }
    : TStep
  : never;

type CompleteCanonicalStep<TStep extends IRStep> = TStep extends {
  kind: 'fold';
}
  ? TStep extends { via: '-|-' | '|-|' }
    ? Omit<WithCanonicalStepLabel<TStep>, 'fraction'> & { fraction: number }
    : WithCanonicalStepLabel<TStep>
  : TStep extends { kind: 'smooth' }
    ? Omit<WithCanonicalStepLabel<TStep>, 'tension'> & { tension: number }
    : WithCanonicalStepLabel<TStep>;

/** 展开折线、平滑路径与标签静态默认值后的路径步骤 */
export type CanonicalStep = CompleteCanonicalStep<IRStep>;

type WithoutCanonicalStepLabel<TStep extends CanonicalStep> = TStep extends unknown
  ? 'label' extends keyof TStep
    ? Omit<TStep, 'label'>
    : TStep
  : never;

/** 流带复用描边输出器时使用的不带标签规范化步骤 */
export type CanonicalStepWithoutLabel = WithoutCanonicalStepLabel<CanonicalStep>;

type CanonicalRibbonStopsWidth = Omit<Extract<IRRibbonWidth, { kind: 'stops' }>, 'interpolation'> & {
  /** 相邻停靠点的插值方式 */
  interpolation: NonNullable<Extract<IRRibbonWidth, { kind: 'stops' }>['interpolation']>;
};

/** 已排序停靠点并补齐插值默认值的流带宽度规则 */
export type CanonicalRibbonWidth = Exclude<IRRibbonWidth, { kind: 'stops' }> | CanonicalRibbonStopsWidth;

type CanonicalRibbonAdaptiveSampling = Omit<Extract<IRRibbonSampling, { kind: 'adaptive' }>, 'maxSamples'> & {
  /** 最大采样数量 */
  maxSamples: number;
};

/** 已展开简写与自适应默认值的流带采样策略 */
export type CanonicalRibbonSampling = Exclude<IRRibbonSampling, { kind: 'adaptive' }> | CanonicalRibbonAdaptiveSampling;

/** 已补齐端点默认值的流带端点 */
export type CanonicalRibbonEndpoint = Omit<NonNullable<IRPathRibbonOptions['start']>, 'cap'> & {
  /** 端点闭合方式 */
  cap: NonNullable<NonNullable<IRPathRibbonOptions['start']>['cap']>;
};

/** 内置流带输出器消费的完整静态选项 */
export type CanonicalRibbonOptions = Omit<
  IRPathRibbonOptions,
  'mode' | 'align' | 'interpolation' | 'start' | 'end' | 'sampling' | 'samples' | 'width' | 'upper' | 'lower'
> & {
  /** 流带构造模式 */
  mode: NonNullable<IRPathRibbonOptions['mode']>;
  /** 中心线对齐方式 */
  align: NonNullable<IRPathRibbonOptions['align']>;
  /** 端点宽度插值方式 */
  interpolation: NonNullable<IRPathRibbonOptions['interpolation']>;
  /** 起始端点 */
  start: CanonicalRibbonEndpoint;
  /** 结束端点 */
  end: CanonicalRibbonEndpoint;
  /** 完整宽度规则 */
  width?: CanonicalRibbonWidth;
  /** 完整采样策略 */
  sampling?: CanonicalRibbonSampling;
  /** 边界流带的上边界 */
  upper?: Array<CanonicalStep>;
  /** 边界流带的下边界 */
  lower?: Array<CanonicalStep>;
};

/** 内置路径输出器消费的完整静态路径形态 */
export type CanonicalPath = Omit<IRPathBase, 'children' | 'label' | 'ribbon' | 'shadow'> & {
  /** 完整路径步骤 */
  children?: Array<CanonicalStep>;
  /** 统一为数组的宿主标签 */
  label?: Array<CanonicalGeometryLabel>;
  /** 完整流带选项 */
  ribbon?: CanonicalRibbonOptions;
  /** 已展开预设与静态默认值的投影 */
  shadow?: ResolvedDropShadow;
};

/** path kind provider 在 resolving 阶段绑定后的定义与 kindOptions */
export type PathKindResolution = Readonly<{
  name: string;
  definition: AnyPathKindDefinition;
  options: unknown;
}>;

/** path generator step 在 resolving 阶段绑定后的定义与参数 */
export type PathGeneratorResolution = Readonly<{
  stepIndex: number;
  name: string;
  definition: PathGeneratorDefinition;
  params: IRJsonObject;
  irPath: string;
}>;

/** arrow mark 的有效视觉属性 */
export type ArrowMarkVisual = Readonly<{
  shape: string;
  scale: number;
  length: number;
  width: number;
  color?: string;
  fill?: string;
  opacity?: number;
  lineWidth: number;
}>;

/** arrow mark 在 resolving 阶段确定的几何输入 */
export type ArrowMarkGeometry = Readonly<{
  baseSize: number;
  tipX: number;
  contactX: number;
  resolvedLength: number;
  resolvedWidth: number;
  boundaryOuterInset: number;
  shrink: number;
}>;

/** arrow mark 在 resolving 阶段绑定的 provider、视觉属性与几何输入 */
export type ArrowMarkResolution = Readonly<{
  mark: IRArrowMark;
  definition: ArrowDefinition;
  visual: ArrowMarkVisual;
  geometry: ArrowMarkGeometry;
}>;

/** ribbon width 在 resolving 阶段绑定的 profile 或静态宽度规则 */
export type RibbonWidthResolution = Readonly<{
  width: CanonicalRibbonWidth;
  definition?: RibbonWidthProfileDefinition;
  params?: IRJsonObject;
  requiresSampling: boolean;
}>;

/** 解析阶段向 target/reference 提供的几何能力 */
export type PathTargetResolver = Readonly<{
  /** 将 target 解析到当前 scope 的局部参考点 */
  pointOfTarget: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 将 target 解析到当前 scope 的参考点 */
  refPointOfTarget?: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 在 resolving 阶段一次性绑定 target 所需的纯节点与边界数据 */
  bindTarget?: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => TargetResolution | null;
}>;

/** resolving phase 绑定后的 target geometry view */
export type PathTargetView = Readonly<{
  /** 已绑定 target 的局部参考点 */
  pointOfTarget: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 已绑定 target 的参考点 */
  referenceOfTarget: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 使用 toward 计算已绑定 target 的裁剪点 */
  clipTarget: (target: IRTarget, toward: IRPosition, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
}>;

/** 解析阶段的窄上下文，不依赖 compile / pipeline 类型 */
export type PathResolveContext = Readonly<{
  /** 当前 scope 的累计变换 */
  scopeChain?: ReadonlyArray<Transform>;
  /** 当前样式级联栈 */
  styleStack?: ReadonlyArray<StyleResolveFrame>;
  /** target/reference 解析能力 */
  targetResolver?: PathTargetResolver;
  /** path kind provider registry */
  pathKinds: ReadonlyMap<string, AnyPathKindDefinition>;
  /** path generator provider registry */
  pathGenerators: ReadonlyMap<string, PathGeneratorDefinition>;
  /** arrow provider registry */
  arrows: ReadonlyMap<string, ArrowDefinition>;
  /** ribbon width profile registry */
  ribbonWidthProfiles: ReadonlyMap<string, RibbonWidthProfileDefinition>;
  /** pattern paint provider registry */
  patterns: ReadonlyMap<string, PatternDefinition>;
  /** paint resource dimensions rounding */
  round: (value: number) => number;
  /** 当前 path 的 IR locator，用于 provider payload 诊断 */
  irPath?: string;
}>;

/** 已绑定的单个路径 target 信息 */
export type TargetResolution = Readonly<{
  /** 原始 target */
  target: IRTarget;
  /** 当前 scope 中的参考点 */
  point: IRPosition | null;
  /** 用于确定段方向的世界参考点 */
  referencePoint: IRPosition | null;
  /** target 引用的纯节点视图；非节点 target 不设置 */
  node?: NodeReferenceView;
  /** target 选择的连接面引用；非节点 target 不设置 */
  boundaryResolution?: BoundaryReferenceResolution;
}>;

/** Path Source IR 经样式、静态默认值与 target 绑定后的基础结果 */
export type PathResolution = Readonly<{
  /** 唯一的 canonical path owner，compile/lower/emit 均从此字段读取路径数据 */
  path: CanonicalPath;
  /** 按步骤 locator 保存的 target 绑定 */
  targets: ReadonlyMap<string, TargetResolution>;
  /** 解析时的 scope chain 快照 */
  scopeChain: ReadonlyArray<Transform>;
  /** 已绑定的 path kind provider 与 options */
  kind: PathKindResolution;
  /** 已完成 paint provider selection 和 pattern style shaping */
  paint: Readonly<{ fill?: PaintResolutionInput; stroke?: PaintResolutionInput }>;
}>;

/** stroke emitter 消费的、已绑定 secondary provider 的 path resolution */
export type StrokePathResolution = PathResolution &
  Readonly<{
    /** 按 canonical step 对象索引的 generator resolution */
    generators: ReadonlyMap<CanonicalStep, PathGeneratorResolution>;
    /** 按 canonical arrow mark 对象索引的 arrow resolution */
    arrows: ReadonlyMap<IRArrowMark, ArrowMarkResolution>;
  }>;

/** ribbon emitter 消费的、已绑定 secondary provider 的 path resolution */
export type RibbonPathResolution = StrokePathResolution &
  Readonly<{
    /** ribbon 顶层 width 的已绑定 profile resolution */
    ribbonWidth?: RibbonWidthResolution;
  }>;

import type { AnyPathDefinition, ArrowDefinition, PatternDefinition, Transform } from '../../contract';
import type {
  IRArrowMark,
  IRPaint,
  IRPathBase,
  IRPathLabel,
  IRPathStyle,
  IRPosition,
  IRStep,
  IRTarget,
  ResolvedDropShadow,
} from '../../schemas';
import type { ThemeMode } from '../../shared';
import type { BoundaryReferenceResolution, NodeReferenceView } from '../node';
import type { PaintResolutionInput } from '../resource';
import type { EffectiveScopeDefaults, GraphicOpacityResolution } from '../style';
import type { ResolvedLabelTextBlock } from '../text';

/** 已把文字与 run 派生颜色确定为字符串的路径标签 */
export type ResolvedPathLabel = Omit<IRPathLabel, 'textColor' | 'text'> & {
  /** 已确定的标签文字主色 */
  textColor?: string;
  /** 已确定 run 颜色的标签正文 */
  text: ResolvedLabelTextBlock;
};

/** 标签的几何配置，不含文本和视觉外观 */
export type PathLabelGeometryOptions = Omit<IRPathLabel, 'text' | 'textColor' | 'font' | 'opacity'>;

/** 已展开默认的标签几何，不含文本和视觉外观 */
export type CanonicalPathLabelPlacement = Omit<
  PathLabelGeometryOptions,
  'position' | 'side' | 'distance' | 'interrupt' | 'gap'
> & {
  /** 路径上的归一化位置 */
  position: number;
  /** 相对宿主的方向 */
  side: NonNullable<IRPathLabel['side']> | 'center';
  /** 相对宿主的距离 */
  distance: number;
  /** 是否中断宿主描边 */
  interrupt: boolean;
  /** 断口留白 */
  gap: number;
};

/** 展开位置、方向与距离默认值后的路径标签 */
export type CanonicalPathLabel = Omit<ResolvedPathLabel, 'position' | 'side' | 'distance' | 'interrupt' | 'gap'> & {
  /** 路径上的归一化位置 */
  position: number;
  /** 相对宿主线段的方向 */
  side: NonNullable<IRPathLabel['side']> | 'center';
  /** 相对宿主线的偏移距离 */
  distance: number;
  /** 是否在兼容的宿主描边上产生断口 */
  interrupt: boolean;
  /** 断口相对标签视觉边界每侧的额外留白 */
  gap: number;
};

type WithResolvedStepLabel<TStep extends IRStep> = TStep extends unknown
  ? 'label' extends keyof TStep
    ? Omit<TStep, 'label'> & { label?: ResolvedPathLabel }
    : TStep
  : never;

/** 已把 step label 派生颜色确定为字符串的步骤 */
export type ResolvedStepSource = WithResolvedStepLabel<IRStep>;

/** 已把 arrow 派生颜色确定为字符串的 mark */
export type ResolvedArrowMark = Omit<IRArrowMark, 'color' | 'fill' | 'stroke'> & {
  /** 已确定的箭头主色 */
  color?: string;
  /** 已确定的箭头填充 */
  fill?: string | IRPaint;
  /** 已解析的描边 */
  stroke?: string | IRPaint;
};

/** 已把所有上下文颜色确定为字符串的 Path Source 投影 */
export type ResolvedPathSource = Omit<IRPathBase, 'style' | 'children' | 'label' | 'marks'> & {
  /** 已确定上下文颜色的路径样式 */
  style?: Omit<IRPathStyle, 'fill' | 'stroke'> & {
    /** 已确定的路径填充 */
    fill?: string | IRPaint;
    /** 已确定的路径描边 */
    stroke?: string | IRPaint;
  };
  /** 已确定 step label 颜色的步骤 */
  children?: Array<ResolvedStepSource>;
  /** 已确定的宿主标签 */
  label?: ResolvedPathLabel | Array<ResolvedPathLabel>;
  /** 已确定 arrow 颜色的 marks */
  marks?: Array<
    Omit<NonNullable<IRPathBase['marks']>[number], 'mark'> & {
      /** 已解析上下文颜色的箭头标记 */
      mark: ResolvedArrowMark;
    }
  >;
};

type WithCanonicalStepLabel<TStep extends ResolvedStepSource> = TStep extends unknown
  ? 'label' extends keyof TStep
    ? Omit<TStep, 'label'> & { label?: CanonicalPathLabel }
    : TStep
  : never;

type CompleteCanonicalStep<TStep extends ResolvedStepSource> = TStep extends {
  kind: 'fold';
}
  ? TStep extends { via: '-|-' | '|-|' }
    ? Omit<WithCanonicalStepLabel<TStep>, 'fraction'> & { fraction: number }
    : WithCanonicalStepLabel<TStep>
  : TStep extends { kind: 'smooth' }
    ? Omit<WithCanonicalStepLabel<TStep>, 'tension'> & { tension: number }
    : TStep extends { kind: 'bend' }
      ? Omit<WithCanonicalStepLabel<TStep>, 'bendDirection' | 'bendAngle'> & {
          bendDirection: NonNullable<TStep['bendDirection']>;
          bendAngle: number;
        }
      : TStep extends { kind: 'circlePath' | 'ellipsePath' }
        ? Omit<WithCanonicalStepLabel<TStep>, 'closed'> & { closed: NonNullable<TStep['closed']> }
        : WithCanonicalStepLabel<TStep>;

/** 展开折线、平滑路径与标签静态默认值后的路径步骤 */
export type CanonicalStep = CompleteCanonicalStep<ResolvedStepSource>;

/** 已展开静态字段并完成 paint 解析的内部路径形态 */
export type CanonicalPath = Omit<
  Omit<ResolvedPathSource, 'style'> & NonNullable<ResolvedPathSource['style']>,
  'children' | 'label' | 'shadow' | 'fill' | 'stroke' | 'strokeWidth' | 'opacity'
> &
  GraphicOpacityResolution & {
    /** 已补齐缺省值的描边宽度 */
    strokeWidth: number;
    /** 已解析的路径填充输入 */
    fill?: PaintResolutionInput;
    /** 已解析的路径描边输入 */
    stroke?: PaintResolutionInput;
    /** 完整路径步骤 */
    children?: Array<CanonicalStep>;
    /** 统一为数组的宿主标签 */
    label?: Array<CanonicalPathLabel>;
    /** 已展开预设与静态默认值的投影 */
    shadow?: ResolvedDropShadow;
  };

/** path provider 在 resolving 阶段绑定后的定义与 kindOptions */
export type PathDefinitionResolution = Readonly<{
  /** 当前路径定义的注册名称 */
  name: string;
  /** 与当前路径匹配的路径定义 */
  definition: AnyPathDefinition;
  /** 通过该 definition 完整 schema 解析后的 source subject */
  path: IRPathBase;
}>;

/** arrow mark 的有效视觉属性 */
export type ArrowMarkVisual = Readonly<{
  /** 箭头形状定义的注册名称 */
  shape: string;
  /** 对有效长度与宽度共同应用的比例系数 */
  scale: number;
  /** 应用 scale 前的箭头长度参数 */
  length: number;
  /** 应用 scale 前的箭头宽度参数 */
  width: number;
  /** 实心箭头的可选填充色，空心箭头不保留该值 */
  fill?: PaintResolutionInput;
  /** 已解析的描边 */
  stroke?: PaintResolutionInput;
  /** 显式虚线序列 */
  dashPattern?: IRArrowMark['dashPattern'];
  /** 虚线相位偏移 */
  dashOffset?: number;
  /** 描边端帽 */
  lineCap?: IRArrowMark['lineCap'];
  /** 描边连接形状 */
  lineJoin?: IRArrowMark['lineJoin'];
  /** 与宿主路径不透明度相乘的箭头不透明度 */
  opacity?: number;
  /** 空心箭头在定义基准坐标中的描边宽度 */
  lineWidth: number;
}>;

/** arrow mark 在 resolving 阶段确定的几何输入 */
export type ArrowMarkGeometry = Readonly<{
  /** 箭头定义采用的几何基准尺寸 */
  baseSize: number;
  /** 箭头尖端在定义基准坐标中的 x */
  tipX: number;
  /** 空心外轮廓补偿后的 marker 局部视觉后缘 */
  visualBackX: number;
  /** 计入空心描边补偿的路径接触点 x */
  contactX: number;
  /** 箭头长度参数乘 scale 后的有效长度 */
  resolvedLength: number;
  /** 箭头宽度参数乘 scale 后的有效宽度 */
  resolvedWidth: number;
  /** 为避开箭头外缘所需的边界内缩量，尚未乘宿主线宽 */
  boundaryOuterInset: number;
  /** 路径端点向内收缩的距离，已含接触重叠补偿且尚未乘宿主线宽 */
  shrink: number;
}>;

/** arrow mark 在 resolving 阶段绑定的 provider、视觉属性与几何输入 */
export type ArrowMarkResolution = Readonly<{
  /** 当前箭头标记的输入声明 */
  mark: IRArrowMark;
  /** 当前箭头匹配的形状定义 */
  definition: ArrowDefinition;
  /** 完成默认值与颜色解析的视觉属性 */
  visual: ArrowMarkVisual;
  /** 用于端点放置和路径收缩的几何参数 */
  geometry: ArrowMarkGeometry;
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
  /** 移除以自动节点目标为起点的折线内部前缀；空数组表示没有外部可见部分 */
  clipPolylineTarget: (
    target: IRTarget,
    points: ReadonlyArray<IRPosition>,
    scopeChain: ReadonlyArray<Transform>,
  ) => Array<IRPosition>;
}>;

/** 解析阶段的窄上下文，不依赖 compile / pipeline 类型 */
export type PathResolveContext = Readonly<{
  /** 当前 scope 的累计变换 */
  scopeChain?: ReadonlyArray<Transform>;
  /** 当前 Scope 的有效默认配置 */
  scopeDefaults?: EffectiveScopeDefaults;
  /** 当前 path 所在位置的 Theme 明暗模式 */
  mode: ThemeMode;
  /** target/reference 解析能力 */
  targetResolver?: PathTargetResolver;
  /** 路径定义能力注册表 */
  paths: ReadonlyMap<string, AnyPathDefinition>;
  /** 箭头能力注册表 */
  arrows: ReadonlyMap<string, ArrowDefinition>;
  /** 图案填充能力注册表 */
  patterns: ReadonlyMap<string, PatternDefinition>;
  /** 填充资源尺寸的数值舍入函数 */
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
  /** 当前路径的 IR 来源，用于 provider 与输出诊断 */
  irPath: string;
  /** 唯一的 canonical path owner，compile/lower/emit 均从此字段读取路径数据 */
  path: CanonicalPath;
  /** 按步骤 locator 保存的 target 绑定 */
  targets: ReadonlyMap<string, TargetResolution>;
  /** 已绑定的 path provider 与 options */
  kind: PathDefinitionResolution;
}>;

/** stroke emitter 消费的、已绑定 secondary provider 的 path resolution */
export type StrokePathResolution = PathResolution &
  Readonly<{
    /** 按 canonical arrow mark 对象索引的 arrow resolution */
    arrows: ReadonlyMap<IRArrowMark, ArrowMarkResolution>;
  }>;

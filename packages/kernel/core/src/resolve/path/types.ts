import type { AnyPathDefinition, ArrowDefinition, MarkDefinition, PatternDefinition, Transform } from '../../contract';
import type {
  IRMarkStyle,
  IRPathMark,
  IRArrowStyle,
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

/** 已解析文字主色与行内片段颜色的路径标签 */
export type ResolvedPathLabel = Omit<IRPathLabel, 'textColor' | 'text'> & {
  /** 已确定的标签文字主色 */
  textColor?: string;
  /** 已解析行级与片段颜色的标签正文 */
  text: ResolvedLabelTextBlock;
};

/** 标签的几何配置，不含文本和视觉外观 */
export type PathLabelGeometryOptions = Omit<IRPathLabel, 'text' | 'textColor' | 'font' | 'opacity'>;

/** 已补齐默认值的标签位置与断线配置 */
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

/** 已解析标签数值颜色的路径步骤 */
export type ResolvedStepSource = WithResolvedStepLabel<IRStep>;

/** 已解析上下文颜色的标记外观 */
export type ResolvedMarkStyle = Omit<IRMarkStyle, 'color' | 'fill' | 'stroke'> & {
  /** 已确定的标记主色 */
  color?: string;
  /** 已确定的标记填充 */
  fill?: string | IRPaint;
  /** 已解析的描边 */
  stroke?: string | IRPaint;
};

/** 已解析路径、标签、箭头和标记数值颜色的路径输入 */
export type ResolvedPathSource = Omit<IRPathBase, 'style' | 'children' | 'label' | 'marks' | 'arrow'> & {
  /** 已确定上下文颜色的路径样式 */
  style?: Omit<IRPathStyle, 'fill' | 'stroke'> & {
    /** 已确定的路径填充 */
    fill?: string | IRPaint;
    /** 已确定的路径描边 */
    stroke?: string | IRPaint;
  };
  /** 已解析步骤标签颜色的路径步骤 */
  children?: Array<ResolvedStepSource>;
  /** 已确定的宿主标签 */
  label?: ResolvedPathLabel | Array<ResolvedPathLabel>;
  /** 已解析的端点箭头 */
  arrow?: {
    /** 起点箭头的颜色与端点重叠配置 */
    start?: ResolvedMarkStyle & { endpointOverlap?: number };
    /** 终点箭头的颜色与端点重叠配置 */
    end?: ResolvedMarkStyle & { endpointOverlap?: number };
  };
  /** 已解析颜色并保留位置、旋转配置的沿线标记 */
  marks?: Array<ResolvedMarkStyle & Pick<IRPathMark, 'pos' | 'rotate'>>;
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

/** 已补齐路径步骤及其标签静态默认值的结果 */
export type CanonicalStep = CompleteCanonicalStep<ResolvedStepSource>;

/** 已补齐静态默认值并解析绘制资源的待编译路径 */
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
    /** 已展开预设并补齐颜色的阴影 */
    shadow?: ResolvedDropShadow;
  };

/** 路径定义及其 schema 解析后的完整路径输入 */
export type PathDefinitionResolution = Readonly<{
  /** 当前路径定义的注册名称 */
  name: string;
  /** 与当前路径匹配的路径定义 */
  definition: AnyPathDefinition;
  /** 经过定义的完整 schema 解析、尚未展开为 CanonicalPath 的路径 */
  path: IRPathBase;
}>;

/** 箭头与标记共用的有效视觉属性 */
export type MarkVisual = Readonly<{
  /** 箭头或标记定义的注册名称 */
  shape: string;
  /** 对有效长度与宽度共同应用的比例系数 */
  scale: number;
  /** 应用 scale 前的长度参数 */
  length: number;
  /** 应用 scale 前的宽度参数 */
  width: number;
  /** 实心定义的可选填充，空心定义不保留该值 */
  fill?: PaintResolutionInput;
  /** 已解析的描边 */
  stroke?: PaintResolutionInput;
  /** 显式虚线序列 */
  dashPattern?: IRMarkStyle['dashPattern'];
  /** 虚线相位偏移 */
  dashOffset?: number;
  /** 描边端帽 */
  lineCap?: IRMarkStyle['lineCap'];
  /** 描边连接形状 */
  lineJoin?: IRMarkStyle['lineJoin'];
  /** 标记自身的不透明度，由绘制阶段与宿主不透明度组合 */
  opacity?: number;
  /** 空心标记在定义基准坐标中的描边宽度 */
  lineWidth: number;
}>;

/** 箭头放置、边界补偿与路径收缩所需的几何参数 */
export type ArrowMarkGeometry = Readonly<{
  /** 箭头定义采用的几何基准尺寸 */
  baseSize: number;
  /** 箭头尖端在定义基准坐标中的 x */
  tipX: number;
  /** 计入外缘补偿后的视觉后缘 x，使用定义的基准坐标 */
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

/** 已绑定定义并确定外观与几何参数的端点箭头 */
export type ArrowMarkResolution = Readonly<{
  /** 当前箭头标记的输入声明 */
  mark: IRArrowStyle;
  /** 当前箭头匹配的形状定义 */
  definition: ArrowDefinition;
  /** 完成默认值与颜色解析的视觉属性 */
  visual: MarkVisual;
  /** 用于端点放置和路径收缩的几何参数 */
  geometry: ArrowMarkGeometry;
}>;

/** 路径解析所需的目标坐标与节点绑定查询能力 */
export type PathTargetResolver = Readonly<{
  /** 查询目标在当前作用域中的局部坐标，无法定位时返回 null */
  pointOfTarget: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 查询目标的世界参考点；未提供或返回空值时，解析器沿用局部坐标 */
  refPointOfTarget?: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 查询目标坐标及所引用的节点与连接面，返回空值时改用坐标查询 */
  bindTarget?: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => TargetResolution | null;
}>;

/** 基于已绑定目标提供的坐标查询与边界裁剪能力 */
export type PathTargetView = Readonly<{
  /** 读取目标的局部坐标，无法定位时返回 null */
  pointOfTarget: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 读取绑定中保存的参考点，未绑定时尝试使用局部坐标 */
  referenceOfTarget: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 沿局部坐标 toward 的方向求节点连接面上的点，返回局部坐标 */
  clipTarget: (target: IRTarget, toward: IRPosition, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 移除以自动节点目标为起点的折线内部前缀；空数组表示没有外部可见部分 */
  clipPolylineTarget: (
    target: IRTarget,
    points: ReadonlyArray<IRPosition>,
    scopeChain: ReadonlyArray<Transform>,
  ) => Array<IRPosition>;
}>;

/** 路径解析所需的作用域配置、目标查询与扩展定义 */
export type PathResolveContext = Readonly<{
  /** 当前作用域的变换链，省略时按无变换处理 */
  scopeChain?: ReadonlyArray<Transform>;
  /** 当前作用域的默认配置，省略时不执行作用域样式合并 */
  scopeDefaults?: EffectiveScopeDefaults;
  /** 当前路径使用的主题明暗模式 */
  mode: ThemeMode;
  /** 目标坐标与引用查询能力；省略时目标绑定中的坐标为空 */
  targetResolver?: PathTargetResolver;
  /** 路径定义能力注册表 */
  paths: ReadonlyMap<string, AnyPathDefinition>;
  /** 箭头能力注册表 */
  arrows: ReadonlyMap<string, ArrowDefinition>;
  /** 普通标记注册表 */
  marks?: ReadonlyMap<string, MarkDefinition>;
  /** 图案填充能力注册表 */
  patterns: ReadonlyMap<string, PatternDefinition>;
  /** 填充资源尺寸的数值舍入函数 */
  round: (value: number) => number;
  /** 当前路径的 IR 路径，用于扩展参数校验错误定位，缺省为 path */
  irPath?: string;
}>;

/** 单个路径目标的坐标与节点绑定结果 */
export type TargetResolution = Readonly<{
  /** 参与绑定的目标，可能已由相对偏移转换为坐标 */
  target: IRTarget;
  /** 当前作用域中的局部坐标，无法定位时为 null */
  point: IRPosition | null;
  /** 绑定器提供的世界参考点；未提供时可能沿用局部坐标，无法定位时为 null */
  referencePoint: IRPosition | null;
  /** 直接引用的节点、坐标或作用域几何，普通坐标目标不设置 */
  node?: NodeReferenceView;
  /** 节点目标选用的连接面，普通坐标目标不设置 */
  boundaryResolution?: BoundaryReferenceResolution;
}>;

/** 路径输入经样式解析、默认值补全与目标绑定后的结果 */
export type PathResolution = Readonly<{
  /** 当前路径的 IR 路径，用于扩展定义与输出的错误定位 */
  irPath: string;
  /** 已补齐默认值并解析绘制资源、供后续编译使用的路径 */
  path: CanonicalPath;
  /** 按步骤字段的 IR 路径保存的目标绑定 */
  targets: ReadonlyMap<string, TargetResolution>;
  /** 已选中的路径定义及其 schema 解析结果 */
  kind: PathDefinitionResolution;
}>;

/** 补齐端点箭头与沿线标记定义后，供 Stroke 编译使用的路径结果 */
export type StrokePathResolution = PathResolution &
  Readonly<{
    /** 以路径端点箭头声明对象为键的解析结果 */
    arrows: ReadonlyMap<IRArrowStyle, ArrowMarkResolution>;
    /** 以沿线标记声明对象为键的解析结果 */
    marks: ReadonlyMap<IRPathMark, MarkResolution>;
  }>;

/** 标记的已解析定义、样式与放置几何 */
export type MarkResolution = Readonly<{
  /** 源样式与参数 */
  mark: IRMarkStyle;
  /** 已绑定的形状定义 */
  definition: MarkDefinition;
  /** 有效绘制样式 */
  visual: MarkVisual;
  /** 局部尺寸和锚点 */
  geometry: {
    /** 定义采用的基准尺寸 */
    baseSize: number;
    /** 长度乘 scale 后的有效值 */
    resolvedLength: number;
    /** 宽度乘 scale 后的有效值 */
    resolvedWidth: number;
    /** 标记的定位锚点，使用定义的基准坐标 */
    anchor: IRPosition;
  };
}>;

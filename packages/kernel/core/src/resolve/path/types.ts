import type {
  AnyPathKindDefinition,
  ArrowDefinition,
  PathGeneratorDefinition,
  PatternDefinition,
  Transform,
} from '../../contract';
import type {
  IRArrowMark,
  IRGeometryLabel,
  IRJsonObject,
  IRPaint,
  IRPathBase,
  IRPosition,
  IRStep,
  IRTarget,
  ResolvedDropShadow,
} from '../../schemas';
import type { ThemeModeValue } from '../../shared';
import type { BoundaryReferenceResolution, NodeReferenceView } from '../node';
import type { PaintResolutionInput } from '../resource';
import type { StyleResolveFrame } from '../style';
import type { ResolvedLabelTextContent } from '../text';

/** 已把文字与 run 派生颜色确定为字符串的路径几何标签 */
export type ResolvedGeometryLabel = Omit<IRGeometryLabel, 'textColor' | 'text'> & {
  /** 已确定的标签文字主色 */
  textColor?: string;
  /** 已确定 run 颜色的标签正文 */
  text: ResolvedLabelTextContent;
};

/** 展开位置、方向与距离默认值后的路径几何标签 */
export type CanonicalGeometryLabel = Omit<ResolvedGeometryLabel, 'position' | 'side' | 'distance'> & {
  /** 路径上的归一化位置 */
  position: number;
  /** 相对宿主线段的方向 */
  side: NonNullable<IRGeometryLabel['side']> | 'center';
  /** 相对宿主线的偏移距离 */
  distance: number;
};

type WithResolvedStepLabel<TStep extends IRStep> = TStep extends unknown
  ? 'label' extends keyof TStep
    ? Omit<TStep, 'label'> & { label?: ResolvedGeometryLabel }
    : TStep
  : never;

/** 已把 step label 派生颜色确定为字符串的步骤 */
export type ResolvedStepSource = WithResolvedStepLabel<IRStep>;

/** 已把 arrow 派生颜色确定为字符串的 mark */
export type ResolvedArrowMark = Omit<IRArrowMark, 'color' | 'fill'> & {
  /** 已确定的箭头主色 */
  color?: string;
  /** 已确定的箭头填充 */
  fill?: string;
};

/** 已把所有上下文颜色确定为字符串的 Path Source 投影 */
export type ResolvedPathSource = Omit<IRPathBase, 'fill' | 'stroke' | 'children' | 'label' | 'marks'> & {
  /** 已确定的路径填充 */
  fill?: string | IRPaint;
  /** 已确定的路径描边 */
  stroke?: string | IRPaint;
  /** 已确定 step label 颜色的步骤 */
  children?: Array<ResolvedStepSource>;
  /** 已确定的宿主标签 */
  label?: ResolvedGeometryLabel | Array<ResolvedGeometryLabel>;
  /** 已确定 arrow 颜色的 marks */
  marks?: Array<Omit<NonNullable<IRPathBase['marks']>[number], 'mark'> & { mark: ResolvedArrowMark }>;
};

type WithCanonicalStepLabel<TStep extends IRStep> = TStep extends unknown
  ? 'label' extends keyof TStep
    ? Omit<TStep, 'label'> & { label?: CanonicalGeometryLabel }
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

/** 内置路径输出器消费的完整静态路径形态 */
export type CanonicalPath = Omit<ResolvedPathSource, 'children' | 'label' | 'shadow'> & {
  /** 完整路径步骤 */
  children?: Array<CanonicalStep>;
  /** 统一为数组的宿主标签 */
  label?: Array<CanonicalGeometryLabel>;
  /** 已展开预设与静态默认值的投影 */
  shadow?: ResolvedDropShadow;
};

/** path kind provider 在 resolving 阶段绑定后的定义与 kindOptions */
export type PathKindResolution = Readonly<{
  name: string;
  definition: AnyPathKindDefinition;
  /** 通过该 definition 完整 schema 解析后的 source subject */
  path: IRPathBase;
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
  /** 当前 path 所在位置的 Theme 明暗模式 */
  mode: ThemeModeValue;
  /** target/reference 解析能力 */
  targetResolver?: PathTargetResolver;
  /** path kind provider registry */
  pathKinds: ReadonlyMap<string, AnyPathKindDefinition>;
  /** path generator provider registry */
  pathGenerators: ReadonlyMap<string, PathGeneratorDefinition>;
  /** arrow provider registry */
  arrows: ReadonlyMap<string, ArrowDefinition>;
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

/** path 静态样式默认值与显式描边请求状态 */
export type PathStyleResolution = Readonly<{
  /** 最终描边宽度，缺省输入已解析为 1 */
  strokeWidth: number;
  /** 用户或级联样式是否显式请求描边字段 */
  strokeRequested: boolean;
  /** stroke emitter 未提供 fill 时的默认值 */
  strokeFillDefault: 'none';
  /** emitter 未提供 stroke 时的默认值 */
  strokeDefault: 'currentColor';
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
  /** 已完成 path kind 相关静态样式默认值解析 */
  style: PathStyleResolution;
}>;

/** stroke emitter 消费的、已绑定 secondary provider 的 path resolution */
export type StrokePathResolution = PathResolution &
  Readonly<{
    /** 按 canonical step 对象索引的 generator resolution */
    generators: ReadonlyMap<CanonicalStep, PathGeneratorResolution>;
    /** 按 canonical arrow mark 对象索引的 arrow resolution */
    arrows: ReadonlyMap<IRArrowMark, ArrowMarkResolution>;
  }>;

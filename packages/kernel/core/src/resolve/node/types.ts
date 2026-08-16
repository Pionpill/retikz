import type { BoundsInsets } from '@retikz/math';

import type { BoundaryDefinition, PatternDefinition, ShapeDefinition } from '../../contract';
import type { ProviderCollection } from '../../providers/registry';
import type {
  IRBoundary,
  IRJsonObject,
  IRLine,
  IRNode,
  IRNodeLabel,
  IRNodeLabelBoundaryPosition,
  NodeLabelPlacementValue,
  NodeLabelPositionValue,
  NodeTextAlignValue,
  ResolvedDropShadow,
  StrokeDashPattern,
} from '../../schemas';
import type { Rect } from '../../shared/geometry';
import type { PaintResolutionInput } from '../resource';
import type { StyleResolveFrame } from '../style';

/** 已补齐边界比例的节点标签位置 */
export type CanonicalNodeLabelBoundaryPosition = Omit<IRNodeLabelBoundaryPosition, 'fraction'> & {
  /** 边界上的归一化位置 */
  fraction: number;
};

/** 展开静态位置与放置默认值后的节点标签 */
export type CanonicalNodeLabel = Omit<IRNodeLabel, 'position' | 'placement'> & {
  /** 标签附着位置 */
  position: NodeLabelPositionValue | number | CanonicalNodeLabelBoundaryPosition;
  /** 标签相对附着点的放置方向 */
  placement: NodeLabelPlacementValue;
};

/** 展开 Node 紧凑写法与静态默认值后的完整内部形态 */
export type CanonicalNode = Omit<
  IRNode,
  | 'padding'
  | 'margin'
  | 'minimumSize'
  | 'scale'
  | 'text'
  | 'label'
  | 'align'
  | 'rotate'
  | 'dashed'
  | 'dotted'
  | 'dashPattern'
  | 'shadow'
> & {
  /** 完整内边距 */
  padding: BoundsInsets;
  /** 完整外边距 */
  margin: BoundsInsets;
  /** 完整最小尺寸 */
  minimumSize: { width: number; height: number };
  /** 完整轴向缩放 */
  scale: { x: number; y: number };
  /** 多行正文 */
  text?: Array<IRLine>;
  /** 已按数组形态展开的附属标签 */
  label?: Array<CanonicalNodeLabel>;
  /** 正文对齐 */
  align: NodeTextAlignValue;
  /** 节点旋转角度 */
  rotate: number;
  /** 已解析的边框虚线样式 */
  dashPattern?: StrokeDashPattern;
  /** 已展开预设与静态默认值的投影 */
  shadow?: ResolvedDropShadow;
};

/** 已解析的节点 shape 定义与实例参数 */
export type ShapeResolution = {
  /** 实际 provider 名称 */
  name: string;
  /** shape provider 定义 */
  definition: ShapeDefinition;
  /** 已校验并按节点缩放处理的实例参数 */
  params: IRJsonObject;
};

/** 已绑定 definition 与参数，但仍可按视觉 rect 解析几何的连接面引用 */
export type BoundaryReferenceResolution = {
  /** 实际 provider 名称；`shape` 表示视觉 shape */
  name: string;
  /** boundary 或视觉 shape provider 定义 */
  definition: BoundaryDefinition | ShapeDefinition;
  /** 已校验的实例参数 */
  params: IRJsonObject;
  /** 是否引用视觉 shape */
  isShape: boolean;
};

/**
 * Path target binding 所需的纯节点几何视图
 *
 * 该视图只保留节点引用与边界几何需要的值，不携带 NamespaceStack、NodeLayout
 * 或其他 compile 编排状态。resolve 阶段将已完成 layout 的节点投影为此视图，
 * 后续 path lowering 只消费这份不可变数据
 */
export type NodeReferenceView = Readonly<{
  /** 节点 id */
  id?: string;
  /** 节点 shape 名称 */
  shapeName: string;
  /** 节点视觉 shape definition */
  shapeDef: ShapeDefinition;
  /** 已校验的 shape 参数 */
  shapeParams: IRJsonObject;
  /** 节点视觉 rect */
  rect: Rect;
  /** 节点外边距 */
  margin: BoundsInsets;
  /** 节点自身默认连接面 */
  boundary?: IRBoundary;
  /** 已绑定的默认连接面 provider 与参数 */
  boundaryResolution: BoundaryReferenceResolution;
  /** 当前节点 IR 路径 */
  irPath?: string;
}>;

/** 将边界引用绑定到 shape 上下文的解析回调 */
export type BoundaryReferenceResolver = (
  boundary: IRBoundary | undefined,
  context: Readonly<{ visualDef: ShapeDefinition; visualParams: IRJsonObject; irPath?: string }>,
) => BoundaryReferenceResolution;

/** 已解析的 Node 输入、shape 与默认连接面 */
export type NodeResolution = {
  /** 当前节点的 IR 路径，用于布局与 provider 诊断 */
  irPath: string;
  /** 样式级联、静态默认值与 auto-contrast 完成后的节点 */
  node: CanonicalNode;
  /** 节点视觉 shape */
  shape: ShapeResolution;
  /** 节点默认连接面引用 */
  boundary: BoundaryReferenceResolution;
  /** 已按有效 pattern registry 解析的节点 paint */
  paint: Readonly<{ fill?: PaintResolutionInput; stroke?: PaintResolutionInput }>;
};

/** Node resolve 阶段需要的样式、provider 与诊断上下文 */
export type NodeResolveContext = {
  /** 当前节点所在 scope 的样式 frame */
  styleFrames: ReadonlyArray<StyleResolveFrame>;
  /** shape provider 注册表 */
  shapes: ProviderCollection<ShapeDefinition>;
  /** boundary provider 注册表 */
  boundaries: ProviderCollection<BoundaryDefinition>;
  /** 当前有效 pattern provider registry */
  patterns: ReadonlyMap<string, PatternDefinition>;
  /** 资源尺寸圆整规则 */
  round: (value: number) => number;
  /** 当前节点的 IR 路径 */
  irPath: string;
  /** compile warning 分发函数 */
  warn: (code: string, message: string) => void;
};

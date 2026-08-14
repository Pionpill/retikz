import type { BoundsInsets } from '@retikz/math';

import type { BoundaryDefinition, ShapeDefinition } from '../../contract';
import type { ProviderCollection } from '../../providers/registry';
import type {
  IRBoundary,
  IRJsonObject,
  IRLineSpec,
  IRNode,
  IRNodeLabel,
  IRNodeLabelBoundaryPosition,
  NodeLabelPlacementValue,
  NodeLabelPositionValue,
  NodeTextAlignValue,
  ResolvedDropShadow,
  StrokeDashPattern,
} from '../../schemas';
import type { EffectiveLabelDefault, StyleResolveFrame } from '../style';

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
  text?: Array<IRLineSpec>;
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
};

/** Node resolve 阶段需要的样式、provider 与诊断上下文 */
export type NodeResolveContext = {
  /** 当前节点所在 scope 的样式 frame */
  styleFrames: ReadonlyArray<StyleResolveFrame>;
  /** shape provider 注册表 */
  shapes: ProviderCollection<ShapeDefinition>;
  /** boundary provider 注册表 */
  boundaries: ProviderCollection<BoundaryDefinition>;
  /** 当前节点的 IR 路径 */
  irPath: string;
  /** compile warning 分发函数 */
  warn: (code: string, message: string) => void;
};

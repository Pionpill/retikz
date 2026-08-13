import type { BoundsInsets } from '@retikz/math';

import type { BoundaryDefinition, ConnectionEnvelopeKind, ShapeDefinition, TextLine } from '../../contract';
import type { ProviderCollection } from '../../providers/registry/index';
import type {
  BlendModeValue,
  IRAnimationTrack,
  IRBoundary,
  IRFont,
  IRJsonObject,
  IRNode,
  IRNodeLabelBoundaryPosition,
  IRPaintSpec,
  NodeLabelPlacementValue,
  NodeLabelPositionValue,
  ResolvedDropShadow,
} from '../../schemas';
import type { Rect } from '../../shared/geometry';
import type { FontSpec, LaidLine, LowerTex, TextMeasurer } from '../text';
import type { CompileWarningCodeValue } from '../warning';

/** 节点文本布局消费的字重，沿用 IR font weight 契约 */
export type NodeFontWeight = NonNullable<IRFont['weight']>;

/** 节点正文与附属 label 共享的文本布局上下文 */
export type NodeTextLayoutContext = {
  /** 待布局节点 */
  node: IRNode;
  /** 文本度量函数 */
  measureText: TextMeasurer;
  /** TeX 降级上下文 */
  texLowering?: TexLoweringContext;
  /** 字体缩放 */
  fontScale: number;
  /** 继承字体族 */
  fontFamily?: string;
  /** 继承字重 */
  fontWeight?: NodeFontWeight;
  /** 继承字体样式 */
  fontStyle?: FontSpec['style'];
};

export type NodeLayout = {
  /** 构建本 layout 的 IR 路径 */
  irPath?: string;
  /** 节点 id */
  id?: string;
  /** 节点形状名 */
  shapeName: string;
  /** 已解析的 shape 定义 */
  shapeDef: ShapeDefinition;
  /** 已校验的 per-instance shape 参数 */
  shapeParams?: IRJsonObject;
  /** 节点视觉边界框 */
  rect: Rect;
  /** 文本内容块中心；非对称 padding 时与视觉 rect 中心不同 */
  contentCenter: [number, number];
  /** IR 原始旋转角 */
  rotateDeg: number;
  /** 外边距 */
  margin: BoundsInsets;
  /** 节点文本行；undefined 表示无文本 */
  lines?: Array<TextLine>;
  /** 含 math run 的混排块，与 lines 互斥 */
  inlineBlock?: { lines: Array<{ laid: LaidLine; baselineOffset: number }> };
  /** 文本块宽度 */
  textWidth: number;
  /** 文本块高度 */
  textHeight: number;
  /** 同次正文排版得到的 authored physical-line baseline offsets */
  textBaselineOffsets?: Array<number>;
  /** 文本对齐 */
  align: 'start' | 'middle' | 'end';
  /** 行高 */
  lineHeight: number;
  /** 文本字号 */
  fontSize: number;
  /**
   * 字体族
   * @default 'sans-serif'
   */
  fontFamily?: string;
  /**
   * 字重
   * @default 'normal'
   */
  fontWeight?: NodeFontWeight;
  /**
   * 字形
   * @default 'normal'
   */
  fontStyle?: 'normal' | 'italic' | 'oblique';
  /**
   * 节点背景填充
   * @default 'transparent'
   */
  fill?: string | IRPaintSpec;
  /**
   * 填充透明度 0~1
   * @default 1
   */
  fillOpacity?: number;
  /**
   * 节点边框 paint
   * @default 'currentColor'
   */
  stroke?: string | IRPaintSpec;
  /**
   * 描边透明度
   * @default 1
   */
  strokeOpacity?: number;
  /**
   * 边框宽度
   * @default 1
   */
  strokeWidth?: number;
  /** 描边 dash pattern，已把 dashed/dotted 预设解析为具体 pattern */
  dashPattern?: Array<number>;
  /** 描边 dash offset */
  dashOffset?: number;
  /**
   * rectangle 圆角半径
   * @default 0
   */
  cornerRadius?: number;
  /**
   * 文字颜色
   * @default 'currentColor'
   */
  textColor?: string;
  /**
   * 整节点透明度
   * @default 1
   */
  opacity?: number;
  /** 已解析的主形状投影 */
  shadow?: ResolvedDropShadow;
  /**
   * 主形状混合模式
   * @default 'normal'
   */
  blendMode?: BlendModeValue;
  /** 已解析的 label 列表 */
  labels?: Array<NodeLabelLayout>;
  /**
   * 节点连接面
   * @default 'shape'
   */
  boundary?: IRBoundary;
  /** provenance 元数据 */
  meta?: IRJsonObject;
  /** 时间轴动画 tracks */
  animations?: Array<IRAnimationTrack>;
  /** 构建本 layout 的 shape 注册表引用 */
  shapes: ProviderCollection<ShapeDefinition>;
  /**
   * boundary 注册表引用
   * @default resolveBoundaryRegistry
   */
  boundaries?: ProviderCollection<BoundaryDefinition>;
  /** shape-aware connection envelope 缓存 */
  connectionEnvelopeCache?: Map<string, Rect>;
  /** tight fallback warning 去重集合 */
  connectionEnvelopeWarnings?: Set<ConnectionEnvelopeKind>;
  /** 当前 node 的 compile warning 分发函数 */
  warn?: (code: CompileWarningCodeValue, message: string) => void;
};

/** 已完成内容与视觉盒测量、尚未绑定 Node rect 的附属标签 */
export type MeasuredNodeLabel = {
  /** 纯文本内容 */
  text: string;
  /** 含公式时的混排行布局 */
  laid?: LaidLine;
  /** 8 方向枚举、center、数字角度，或 box-like boundary 上的归一位置 */
  position: NodeLabelPositionValue | number | IRNodeLabelBoundaryPosition;
  /** label 相对附着点向外或向内偏移 */
  placement: NodeLabelPlacementValue;
  /** Node border 到 label 视觉盒的净距 */
  distance: number;
  /**
   * label 文本颜色
   * @default 'currentColor'
   */
  textColor?: string;
  /**
   * label 整体不透明度
   * @default 1
   */
  opacity?: number;
  fontSize: number;
  /**
   * label 字体族
   * @default 'sans-serif'
   */
  fontFamily?: string;
  /**
   * label 字重
   * @default 'normal'
   */
  fontWeight?: NodeFontWeight;
  /**
   * label 字形
   * @default 'normal'
   */
  fontStyle?: 'normal' | 'italic' | 'oblique';
  /**
   * label 文本自旋模式
   * @default 'none'
   */
  rotate?: 'none' | 'radial' | 'tangent' | number;
  /**
   * 自旋后若文字倒置则翻 180°
   * @default false
   */
  keepUpright?: boolean;
  /** label 文本视觉盒宽度 */
  measuredWidth: number;
  /** label 文本视觉盒高度 */
  measuredHeight: number;
  /** label 规范化后的基线上伸 */
  ascent: number;
  /** label 规范化后的基线下伸 */
  descent: number;
  /**
   * pin 引线配置
   * @default false
   */
  pin?: boolean | { stroke?: string; strokeWidth?: number; dashPattern?: Array<number>; dashOffset?: number };
};

/** 节点附属标签的最终局部布局 */
export type NodeLabelLayout = MeasuredNodeLabel & {
  /** 最终 label 自旋角 */
  rotateDeg: number;
  /** 相对最终 Node rect 几何中心的局部偏移 */
  centerOffset: [number, number];
};

/** 公式渲染上下文 */
export type TexLoweringContext = {
  lowerTex?: LowerTex;
  warn: (code: CompileWarningCodeValue, message: string) => void;
};

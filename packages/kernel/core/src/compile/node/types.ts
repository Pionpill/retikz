import type { BoundaryDefinition } from '../../contract/boundary';
import type { TextLine } from '../../contract/scene';
import type { ShapeDefinition } from '../../contract/shape';
import type { ProviderCollection } from '../../providers/registry';
import type {
  BlendModeValue,
  IRAnimationTrack,
  IRBoundary,
  IRJsonObject,
  IRNodeLabelBoundaryPosition,
  IRPaintSpec,
  NodeLabelPlacementValue,
  NodeLabelPositionValue,
  ResolvedDropShadow,
} from '../../schemas';
import type { Rect } from '../../shared/geometry';
import type { CompileWarningCodeValue } from '../constant';
import type { LowerTex } from '../lower-tex';
import type { LaidLine } from '../text-layout';

export type NodeLayout = {
  /** 节点 id（其他位置可引用） */
  id?: string;
  /** 节点形状名（诊断 / 错误信息用；几何走 shapeDef） */
  shapeName: string;
  /** 已解析的 shape 定义；circumscribe / boundaryPoint / anchor / emit 多点复用，取代旧 switch */
  shapeDef: ShapeDefinition;
  /**
   * 已校验的 per-instance shape 参数（经 `paramsSchema.parse` + `JsonObjectSchema.parse` 双护栏）
   * @description 透传给 `shapeDef` 的 circumscribe / boundaryPoint / anchor / edgePoint / emit；
   *   无参形状（内置 4 个）解析为 `{}`。省略时各调用点以空对象兜底（合成 layout 如 coordinate / scope.id）。
   * @default {}
   */
  shapeParams?: IRJsonObject;
  /**
   * 节点视觉边界框（所有 shape 共享语义）
   * @description rectangle: rect 本身；circle: width=height=2×radius；ellipse: 2×rx,2×ry；diamond: 2×halfA,2×halfB。x,y 是几何中心，rotate 弧度
   */
  rect: Rect;
  /** IR 原始旋转角（度数），供 emit 阶段写入 GroupPrim 的 rotate transform */
  rotateDeg: number;
  /** 外边距（≥ 0），path 附着到外扩 margin 的虚拟边界 */
  margin: number;
  /**
   * 节点文本行（undefined 表示无文本，否则非空数组）
   * @description 每行可带覆盖样式（fill/opacity/fontSize/fontFamily/fontWeight/fontStyle），未覆盖字段 emit 阶段不写出由下游走块级默认
   */
  lines?: Array<TextLine>;
  /**
   * 含 math run 的混排块（与 lines 互斥）：逐行 emit TextPrim / glyph group
   * @description 每行 laid 携带度量 + emit；baselineOffset 是该行 alphabetic 基线相对块顶的距离
   */
  inlineBlock?: { lines: Array<{ laid: LaidLine; baselineOffset: number }> };
  /** 文本块宽度 = max(per-line measureText.width) */
  textWidth: number;
  /** 文本块高度 ≈ lines × lineHeight */
  textHeight: number;
  /** 文本对齐（start / middle / end 三态） */
  align: 'start' | 'middle' | 'end';
  /** 行高（已应用默认值） */
  lineHeight: number;
  /** 文本字号（已应用默认值） */
  fontSize: number;
  /**
   * 字体族（CSS font-family）
   * @default 'sans-serif'
   */
  fontFamily?: string;
  /**
   * 字重
   * @default 'normal'
   */
  fontWeight?: string | number;
  /**
   * 字形
   * @default 'normal'
   */
  fontStyle?: 'normal' | 'italic' | 'oblique';
  /**
   * 节点背景填充（纯色 / PaintSpec gradient），emit 时经 resolvePaint → PaintValue、'transparent' 兜底
   * @default 'transparent'
   */
  fill?: string | IRPaintSpec;
  /**
   * 填充透明度 0~1
   * @default 1
   */
  fillOpacity?: number;
  /**
   * 节点边框 paint，emit 时经 resolvePaint → PaintValue、'currentColor' 兜底
   * @default 'currentColor'
   */
  stroke?: string | IRPaintSpec;
  /**
   * 描边透明度 0~1（TikZ `draw opacity`）
   * @default 1
   */
  strokeOpacity?: number;
  /**
   * 边框宽度，emit 时 1 兜底
   * @default 1
   */
  strokeWidth?: number;
  /** 描边 dash pattern，已把 dashed/dotted 预设解析为具体 pattern */
  dashPattern?: Array<number>;
  /**
   * rectangle 圆角半径（非 rect shape 无效）
   * @default 0
   */
  cornerRadius?: number;
  /**
   * 文字颜色，emit 时 'currentColor' 兜底
   * @default 'currentColor'
   */
  textColor?: string;
  /**
   * 整节点透明度 0~1（同时挂 shape 与 text primitive）
   * @default 1
   */
  opacity?: number;
  /** 已解析的主形状投影（compile 已展开 preset + 显式覆盖）；仅挂 shape 几何图元，不挂 text */
  shadow?: ResolvedDropShadow;
  /**
   * 主形状混合模式（与下方已绘内容混合）；仅挂 shape 几何图元，不挂 text
   * @default 'normal'
   */
  blendMode?: BlendModeValue;
  /**
   * 已解析的 label 列表
   * @description IR 层 `Node.label` 标准化：position 默认 'top'、distance 默认 DEFAULT_LABEL_DISTANCE、font 从 Node 继承
   * @default []
   */
  labels?: Array<NodeLabelLayout>;
  /**
   * 节点默认连接面（来自 IR `node.boundary`；undefined = 'shape'）；path 端点 boundary 可覆盖
   * @default 'shape'
   */
  boundary?: IRBoundary;
  /** provenance 元数据（来自 IR `node.meta`）；emit 时原样 stamp 到 node 的 top-level 图元，renderer 忽略 */
  meta?: IRJsonObject;
  /** 时间轴动画 tracks（来自 IR `node.animations`）；emit 时原样 stamp 到 node 的 top-level 图元，renderer 播放 / 降级 */
  animations?: Array<IRAnimationTrack>;
  /** 构建本 layout 的 shape 注册表引用——借用连接面（borrowed boundary）查表用 */
  shapes: ProviderCollection<ShapeDefinition>;
  /**
   * 构建本 layout 的 boundary 注册表引用——connection surface provider 查表用
   * @default resolveBoundaryRegistry()
   */
  boundaries?: ProviderCollection<BoundaryDefinition>;
};

/** 节点附属标签 layout（layoutNode 已合并默认值与样式继承） */
export type NodeLabelLayout = {
  /** 纯文本内容（混排时是各 text run 拼接，仅作 fallback / 测量） */
  text: string;
  /** 含公式时的混排行布局（emit 走 laid）；纯文本时 undefined */
  laid?: LaidLine;
  /** 8 方向枚举、center、数字角度，或 box-like boundary 上的归一位置 */
  position: NodeLabelPositionValue | number | IRNodeLabelBoundaryPosition;
  /** label 相对附着点向外或向内偏移 */
  placement: NodeLabelPlacementValue;
  /** 已应用默认值 */
  distance: number;
  /**
   * label 文本颜色。
   * @default 'currentColor'
   */
  textColor?: string;
  /**
   * label 整体不透明度。
   * @default 1
   */
  opacity?: number;
  fontSize: number;
  /**
   * label 字体族。
   * @default 'sans-serif'
   */
  fontFamily?: string;
  /**
   * label 字重。
   * @default 'normal'
   */
  fontWeight?: string | number;
  /**
   * label 字形。
   * @default 'normal'
   */
  fontStyle?: 'normal' | 'italic' | 'oblique';
  /**
   * label 文本自旋模式（none / radial / tangent / 数字角度）；缺省 = 不旋转
   * @default 'none'
   */
  rotate?: 'none' | 'radial' | 'tangent' | number;
  /**
   * 自旋后若文字倒置则翻 180°；缺省 false
   * @default false
   */
  keepUpright?: boolean;
  /** label 文本测量宽度（pin leader 算 label 框近边用） */
  measuredWidth: number;
  /**
   * pin：true = 默认引线；对象 = 带样式引线（stroke / strokeWidth / dashPattern）；缺省 / false = 无引线
   * @default false
   */
  pin?: boolean | { stroke?: string; strokeWidth?: number; dashPattern?: Array<number> };
};

/**
 * 公式渲染上下文：注入的 lowerTex + 预绑路径的 warn 发射器
 * @description compile 调用点把 onWarn + IR locator 预绑成 warn 闭包传入，使 layoutNode 不必背 onWarn / path。
 */
export type TexLoweringContext = {
  lowerTex?: LowerTex;
  warn: (code: CompileWarningCodeValue, message: string) => void;
};

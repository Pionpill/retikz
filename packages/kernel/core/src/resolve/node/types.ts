import type { JsonObject, PropertyPath } from '@retikz/foundation';
import type { BoundsInsets } from '@retikz/math';

import type { BoundaryDefinition, PatternDefinition, ShapeDefinition } from '../../contract';
import type { ProviderRegistry } from '../../providers';
import type {
  CanonicalDropShadow,
  IRBoundary,
  IRNode,
  IRNodeLabel,
  IRNodeLabelBoundaryPosition,
  IRNodeStyle,
  IRPaint,
  NodeLabelPlacement,
  NodeLabelPosition,
  NodeTextAlign,
  StrokeDashPattern,
} from '../../schemas';
import type { ThemeMode } from '../../shared';
import type { CanonicalPosition } from '../position';
import type { InputPaintResolution } from '../resource';
import type { MergedScopeDefaults } from '../style';
import type { CanonicalTextBlock, ColorResolvedTextLine, LabelTextColorSource } from '../text';

/** 已解析描边颜色与绘制资源的节点标签引线 */
export type CanonicalNodeLabelPin = Omit<Exclude<IRNodeLabel['pin'], boolean | undefined>, 'stroke'> & {
  /** 已解析的引线描边，可为颜色或绘制资源 */
  stroke?: InputPaintResolution;
};

/** 已解析节点自身数值颜色的中间结果，正文和标签颜色仍待处理 */
export type NodePrimaryColorSource = Omit<IRNode, 'style'> & {
  /** 已确定上下文颜色的节点样式 */
  style?: Omit<IRNodeStyle, 'fill' | 'stroke' | 'textColor'> & {
    /** 已确定的节点填充 */
    fill?: string | IRPaint;
    /** 已确定的节点描边 */
    stroke?: string | IRPaint;
    /** 已确定的节点正文主色 */
    textColor?: string;
  };
};

/** 已补齐位置与放置默认值、颜色尚待解析的标签 */
export type NodeLabelPlacementSource = Omit<IRNodeLabel, 'align' | 'position' | 'placement' | 'distance'> & {
  align: CanonicalNodeLabel['align'];
  position: CanonicalNodeLabel['position'];
  placement: CanonicalNodeLabel['placement'];
  distance: number;
};

/** 已展开标签及其默认配置的节点输入 */
export type NodeLabelSource = Omit<IRNode, 'label'> & {
  label?: Array<NodeLabelPlacementSource>;
};

/** 已展开标签默认配置并解析节点自身数值颜色的节点输入 */
export type NodeLabelPrimaryColorSource = Omit<NodePrimaryColorSource, 'label'> & {
  label?: Array<NodeLabelPlacementSource>;
};

/** 已解析节点、正文和标签数值颜色的节点输入 */
export type NodeColorSource = Omit<NodePrimaryColorSource, 'text' | 'label'> & {
  /** 已解析行级与片段颜色的正文 */
  text?: string | Array<ColorResolvedTextLine>;
  /** 已解析文字和引线颜色的附属标签 */
  label?: Array<NodeLabelColorSource>;
};

/** 已补齐边界比例的节点标签位置 */
export type CanonicalNodeLabelBoundaryPosition = Omit<IRNodeLabelBoundaryPosition, 'fraction'> & {
  /** 边界上的归一化位置 */
  fraction: number;
};

/** 已展开位置默认值并解析正文与引线颜色的标签输入 */
export type NodeLabelColorSource = Omit<
  IRNodeLabel,
  'align' | 'position' | 'placement' | 'distance' | 'textColor' | 'text' | 'pin'
> & {
  /** 标签视觉盒沿附着切线的对齐方式 */
  align: NodeTextAlign;
  /** 标签附着位置 */
  position: NodeLabelPosition | number | CanonicalNodeLabelBoundaryPosition;
  /** 标签相对附着点的放置方向 */
  placement: NodeLabelPlacement;
  /** 标签到节点边界的距离 */
  distance: number;
  /** 已确定的标签文字主色 */
  textColor?: string;
  /** 已解析行级与片段颜色的标签正文 */
  text: LabelTextColorSource;
  /** 已解析描边颜色与绘制资源的标签引线 */
  pin?: boolean | CanonicalNodeLabelPin;
};

/** 已完成字体、正文和外观解析的节点标签 */
export type CanonicalNodeLabel = Omit<
  NodeLabelColorSource,
  'text' | 'font' | 'textColor' | 'lineHeight' | 'maxTextWidth' | 'textAlign'
> & {
  /** 已确定的共享文本块 */
  text: CanonicalTextBlock;
};

/** 已绑定的节点形状定义与实例参数 */
export type CanonicalNodeShape = {
  /** 实际选中的形状定义名称 */
  name: string;
  /** 形状定义 */
  definition: ShapeDefinition;
  /** 已校验并按节点缩放处理的实例参数 */
  params: JsonObject;
};

/** 已绑定定义与参数的连接面，几何需结合节点视觉尺寸计算 */
export type CanonicalNodeBoundary = {
  /** 实际选中的定义名称；沿用节点形状时为该形状的名称 */
  name: string;
  /** 选中的连接面定义或形状定义 */
  definition: BoundaryDefinition | ShapeDefinition;
  /** 已校验的实例参数 */
  params: JsonObject;
  /** 是否使用形状定义；既可为节点自身形状，也可为另行指定的形状 */
  isShape: boolean;
};

/** 解析连接面所需的节点形状与定义注册表 */
export type NodeBoundaryResolveContext = {
  /** 节点视觉形状定义 */
  visualDef: ShapeDefinition;
  /** 节点视觉形状参数 */
  visualParams: JsonObject;
  /** 形状定义注册表 */
  shapeRegistry: ProviderRegistry<ShapeDefinition>;
  /** 连接面定义注册表 */
  boundaryRegistry: ProviderRegistry<BoundaryDefinition>;
  /** 当前节点的 IR 路径，用于参数校验错误定位 */
  irPath?: PropertyPath;
};

/** 结合节点视觉形状解析连接面定义与参数的回调 */
export type NodeBoundaryResolver = (
  boundary: IRBoundary | undefined,
  context: Readonly<Pick<NodeBoundaryResolveContext, 'visualDef' | 'visualParams' | 'irPath'>>,
) => CanonicalNodeBoundary;

/** 已解析的节点输入、形状与默认连接面 */
export type CanonicalNode = Readonly<{
  /** 可选的声明名称 */
  id?: string;
  /** 同一节点的其他声明名称 */
  aliasIds: Array<string>;
  /** 用户元数据 */
  meta?: JsonObject;
  /** 显式绘制顺序，省略时沿用声明顺序 */
  zIndex?: number;
  /** 已补全的布局意图 */
  layout: CanonicalNodeLayout;
  /** 视觉形状能力与参数 */
  shape: CanonicalNodeShape;
  /** 连接边界能力与参数 */
  boundary: CanonicalNodeBoundary;
  /** 已补全的有效绘制属性 */
  style: CanonicalNodeStyle;
  /** 正文内容，省略表示无正文 */
  text?: CanonicalTextBlock;
  /** 已解析的附属标签 */
  labels: Array<CanonicalNodeLabel>;
  /** 已校验的元素动画 */
  animations: NonNullable<IRNode['animations']>;
}>;

/** 已补齐位置默认值并完成尺寸、间距缩放的节点布局配置 */
export type CanonicalNodeLayout = {
  /** 位置表达式的静态默认值已完成，引用在 compile 阶段读取 */
  position: CanonicalPosition | Required<Extract<NonNullable<IRNode['position']>, { kind: 'anchor' }>>;
  /** 已按节点两轴缩放的完整内边距 */
  padding: BoundsInsets;
  /** 已按节点两轴缩放的完整外边距 */
  margin: BoundsInsets;
  /** 已按节点两轴缩放的边界最小尺寸 */
  minimumSize: {
    /** 最小宽度 */
    width: number;
    /** 最小高度 */
    height: number;
  };
  /** 节点旋转角度，单位为度 */
  rotate: number;
  /** 已按节点水平缩放的显式宽度，省略时由内容和布局约束确定 */
  width?: number;
};

/** 完整绘制属性；shadow 缺失表示不投影 */
export type CanonicalNodeStyle = {
  /** 已解析的节点填充 */
  fill: InputPaintResolution;
  /** 已解析的节点描边 */
  stroke: InputPaintResolution;
  /** 填充不透明度 */
  fillOpacity: number;
  /** 描边不透明度 */
  strokeOpacity: number;
  /** 整体不透明度 */
  opacity: number;
  /** 描边宽度 */
  strokeWidth: number;
  /** 已解析的边框虚线样式 */
  dashPattern: StrokeDashPattern;
  /** 虚线起始偏移 */
  dashOffset: number;
  /** 描边端点样式 */
  lineCap: NonNullable<IRNodeStyle['lineCap']>;
  /** 描边连接样式 */
  lineJoin: NonNullable<IRNodeStyle['lineJoin']>;
  /** 节点圆角半径 */
  cornerRadius: number;
  /** 绘制混合模式 */
  blendMode: NonNullable<IRNodeStyle['blendMode']>;
  /** 已展开预设并补齐颜色的阴影 */
  shadow?: CanonicalDropShadow;
};

/** 节点解析所需的默认配置、扩展定义与诊断能力 */
export type NodeResolveContext = {
  /** 相对定位缺省距离 */
  nodeDistance: number;
  /** preset 与 rem 字号解析的根字号 */
  rootFontSize: number;
  /** 是否启用公式简写解析 */
  gatingOn: boolean;
  /** 当前节点所在作用域的有效默认配置 */
  scopeDefaults: MergedScopeDefaults;
  /** 当前节点使用的主题明暗模式 */
  mode: ThemeMode;
  /** 形状定义注册表 */
  shapeRegistry: ProviderRegistry<ShapeDefinition>;
  /** 连接面定义注册表 */
  boundaryRegistry: ProviderRegistry<BoundaryDefinition>;
  /** 当前可用的图案定义注册表 */
  patternRegistry: ProviderRegistry<PatternDefinition>;
  /** 资源尺寸圆整规则 */
  round: (value: number) => number;
  /** 当前节点的 IR 路径 */
  irPath: PropertyPath;
  /** 接收节点解析警告的回调 */
  warn: (code: string, message: string, path?: PropertyPath) => void;
  /** 节点标签缺省距离 */
  labelDistance: number;
};

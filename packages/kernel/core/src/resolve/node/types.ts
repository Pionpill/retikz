import type { JsonObject } from '@retikz/foundation';
import type { BoundsInsets, CenteredBox } from '@retikz/math';

import type { BoundaryDefinition, PatternDefinition, ShapeDefinition } from '../../contract';
import type { ProviderRegistry } from '../../providers';
import type {
  IRBoundary,
  IRNode,
  IRNodeLabel,
  IRNodeLabelBoundaryPosition,
  IRNodeLayout,
  IRNodeStyle,
  IRPaint,
  NodeLabelPlacement,
  NodeLabelPosition,
  NodeTextAlign,
  CanonicalDropShadow,
  StrokeDashPattern,
} from '../../schemas';
import type { ThemeMode } from '../../shared';
import type { InputPaintResolution } from '../resource';
import type { MergedScopeDefaults, GraphicOpacityResolution } from '../style';
import type { LabelTextColorSource, ColorResolvedTextLine } from '../text';

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
  label?: Array<CanonicalNodeLabel>;
};

/** 已补齐边界比例的节点标签位置 */
export type CanonicalNodeLabelBoundaryPosition = Omit<IRNodeLabelBoundaryPosition, 'fraction'> & {
  /** 边界上的归一化位置 */
  fraction: number;
};

/** 展开静态位置与放置默认值后的节点标签 */
export type CanonicalNodeLabel = Omit<
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

/** 已展开节点简写、补齐静态默认值并解析绘制资源的待布局节点 */
export type CanonicalNode = Omit<
  Omit<NodeColorSource, 'style' | 'layout'> & NonNullable<NodeColorSource['style']> & IRNodeLayout,
  | 'padding'
  | 'position'
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
  | 'fill'
  | 'stroke'
  | 'opacity'
> &
  GraphicOpacityResolution & {
    /** 已解析的节点填充 */
    fill?: InputPaintResolution;
    /** 已解析的节点描边 */
    stroke?: InputPaintResolution;
    /** 已补齐默认值的位置，非笛卡尔形态交由布局阶段定位 */
    position: NonNullable<IRNode['position']>;
    /** 完整内边距 */
    padding: BoundsInsets;
    /** 完整外边距 */
    margin: BoundsInsets;
    /** 完整最小尺寸 */
    minimumSize: {
      /** 节点边界的最小宽度 */
      width: number;
      /** 节点边界的最小高度 */
      height: number;
    };
    /** 完整轴向缩放 */
    scale: {
      /** 水平方向缩放系数 */
      x: number;
      /** 垂直方向缩放系数 */
      y: number;
    };
    /** 多行正文 */
    text?: Array<ColorResolvedTextLine>;
    /** 已按数组形态展开的附属标签 */
    label?: Array<CanonicalNodeLabel>;
    /** 正文对齐 */
    align: NodeTextAlign;
    /** 节点旋转角度，单位为度 */
    rotate: number;
    /** 已解析的边框虚线样式 */
    dashPattern?: StrokeDashPattern;
    /** 已展开预设并补齐颜色的阴影 */
    shadow?: CanonicalDropShadow;
  };

/** 已绑定的节点形状定义与实例参数 */
export type ShapeResolution = {
  /** 实际选中的形状定义名称 */
  name: string;
  /** 形状定义 */
  definition: ShapeDefinition;
  /** 已校验并按节点缩放处理的实例参数 */
  params: JsonObject;
};

/** 已绑定定义与参数的连接面，几何需结合节点视觉尺寸计算 */
export type BoundaryResolution = {
  /** 实际选中的定义名称；沿用节点形状时为该形状的名称 */
  name: string;
  /** 选中的连接面定义或形状定义 */
  definition: BoundaryDefinition | ShapeDefinition;
  /** 已校验的实例参数 */
  params: JsonObject;
  /** 是否使用形状定义；既可为节点自身形状，也可为另行指定的形状 */
  isShape: boolean;
};

/**
 * 位置引用与路径连接所需的只读节点几何
 * @description 由编译阶段从节点布局中提取，供解析器查询节点位置、形状和连接面
 */
export type NodeReferenceGeometry = Readonly<{
  /** 节点 id */
  id?: string;
  /** 节点形状名称 */
  shapeName: string;
  /** 节点视觉形状定义 */
  shapeDef: ShapeDefinition;
  /** 已解析并应用缩放的形状参数 */
  shapeParams: JsonObject;
  /** 节点视觉外框，x、y 表示中心，rotate 使用弧度 */
  rect: CenteredBox;
  /** 节点外边距 */
  margin: BoundsInsets;
  /** 节点自身默认连接面 */
  boundary?: IRBoundary;
  /** 已绑定的默认连接面定义与参数 */
  boundaryResolution: BoundaryResolution;
  /** 当前节点 IR 路径 */
  irPath?: string;
}>;

/** 结合节点视觉形状解析连接面定义与参数的回调 */
export type NodeBoundaryResolver = (
  boundary: IRBoundary | undefined,
  context: Readonly<{ visualDef: ShapeDefinition; visualParams: JsonObject; irPath?: string }>,
) => BoundaryResolution;

/** 已解析的节点输入、形状与默认连接面 */
export type NodeResolution = Readonly<{
  /** 当前节点的 IR 路径，用于布局与扩展定义的错误定位 */
  irPath: string;
  /** 已完成样式继承、颜色和绘制资源解析并补齐默认值的节点 */
  node: CanonicalNode;
  /** 节点视觉形状 */
  shape: ShapeResolution;
  /** 节点默认连接面引用 */
  boundary: BoundaryResolution;
}>;

/** 节点解析所需的默认配置、扩展定义与诊断能力 */
export type NodeResolveContext = {
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
  irPath: string;
  /** 接收节点解析警告的回调 */
  warn: (code: string, message: string) => void;
  /** 节点标签缺省距离 */
  labelDistance: number;
};

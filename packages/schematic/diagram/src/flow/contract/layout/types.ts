import type { IRGeometryLabel } from '@retikz/core';
import type { RelationDirectionValue } from '@retikz/graph';
import type { BoundsInsets, BoundsRect, Position } from '@retikz/math';

import type { IRFlowLayout } from '../../schemas';
import type {
  FlowDirectionValue,
  FlowLayoutAlignmentValue,
  FlowPlacementKindValue,
  FlowRoutingKindValue,
} from '../../shared';

/** 已补全默认值的固定排列配置；Grid 使用物理行列，不改变流程方向 */
export type EffectiveFlowPlacement =
  | Readonly<{
      /** 沿单一方向排列 */
      kind: 'linear';
      /** 直接子项的排列方向 */
      direction: FlowDirectionValue;
      /** 相邻直接子项的间距，使用用户单位 */
      gap: number;
      /** 直接子项在交叉轴上的对齐方式 */
      align: FlowLayoutAlignmentValue;
      /** 仅排除对外结构边界贡献，不移除局部排列或绘制 */
      excludeFromBounds?: ReadonlyArray<string>;
    }>
  | Readonly<{
      /** 按物理行列排列 */
      kind: 'grid';
      /** 已补全的行列最小间距，使用用户单位 */
      gap: Readonly<{ row: number; column: number }>;
      /** 是否用关系标签的测量尺寸扩大对应轨道间距 */
      reserveLabelSpace: boolean;
      /** 每个直接子项对应的物理行列位置 */
      placements: Extract<IRFlowLayout, { kind: 'grid' }>['placements'];
      /** 仅排除对外结构边界贡献，不移除局部排列或绘制 */
      excludeFromBounds?: ReadonlyArray<string>;
    }>;

/** Flow layout provider 使用的有效路由 */
export type FlowLayoutRouting =
  | Readonly<{ kind: 'straight' }>
  | Readonly<{ kind: 'orthogonal' | '-|' | '|-'; cornerRadius: number }>
  | Readonly<{
      kind: 'bend';
      /** 省略时由布局比较左右候选 */
      bendDirection?: 'left' | 'right';
      /** 省略时由布局比较 30、45、60 度；显式及继承值必须保留 */
      bendAngle?: number;
    }>
  | Readonly<{ kind: 'bend'; outAngle: number; inAngle: number; looseness: number }>;

/** 完整标签提供给布局的几何配置，不包含文字或外观 */
export type FlowLayoutLabelPlacement = Readonly<Omit<IRGeometryLabel, 'text' | 'textColor' | 'font' | 'opacity'>>;

/** bend 参考几何，仅保留一个生效参数族 */
export type FlowBendRoute = Readonly<{ kind: 'bend'; points: readonly [Readonly<Position>, Readonly<Position>] }> &
  (
    | Readonly<{ bendDirection: 'left' | 'right'; bendAngle: number }>
    | Readonly<{ outAngle: number; inAngle: number; looseness: number }>
  );

/** 布局已确定的参考路由，实际端点裁剪与箭头缩短由 Core 执行 */
export type FlowLayoutRoute =
  | Readonly<{ kind: 'straight'; points: ReadonlyArray<Readonly<Position>> }>
  | Readonly<{ kind: 'orthogonal' | '-|' | '|-'; points: ReadonlyArray<Readonly<Position>>; cornerRadius: number }>
  | FlowBendRoute;

/** Flow layout scope 已补全的有效配置 */
export type EffectiveFlowLayout = Readonly<{
  /** 当前作用域的流程主方向 */
  direction: FlowDirectionValue;
  /** 同层元素之间的最小间距，使用用户单位 */
  nodeGap: number;
  /** 相邻层之间的最小间距，使用用户单位 */
  rankGap: number;
  /** 已补全圆角等参数的关系路由 */
  routing: FlowLayoutRouting;
}>;

/** Layout Definition 提供的唯一末端默认值 */
export type FlowLayoutDefaults = Readonly<{
  /** Source 与祖先均未指定时采用的流程主方向 */
  direction: FlowDirectionValue;
  /** Source 与祖先均未指定时采用的同层最小间距，使用用户单位 */
  nodeGap: number;
  /** Source 与祖先均未指定时采用的层间最小间距，使用用户单位 */
  rankGap: number;
  /** 固定 Layout 未获得作者间距时使用的物理轴默认值，不影响自动布局 */
  placementGap: Readonly<{
    /** 左右排列与 Grid 列间距 */
    horizontal: number;
    /** 上下排列与 Grid 行间距 */
    vertical: number;
  }>;
  /** Source 与祖先均未指定时采用的关系路由 */
  routing: Readonly<{
    /** 默认路由种类，必须包含在 capabilities.routingKinds 中 */
    kind: FlowRoutingKindValue;
    /** 所有轴对齐路由的圆角默认；支持任一轴对齐模式时必填 */
    orthogonalCornerRadius?: number;
  }>;
}>;

/** Flow layout 固定尺寸 */
export type FlowLayoutSize = Readonly<Pick<BoundsRect, 'width' | 'height'>>;

/** 已测量的 Flow leaf 输入 */
export type FlowLayoutLeafInput = Readonly<{
  /** 已测量 Entity 的输入判别字段 */
  kind: 'leaf';
  /** 作者指定的元素 id，与输出 id 对应 */
  id: string;
  /** 最近 Flow 作用域内的可选层级约束，省略时由布局决定 */
  rank?: number;
  /** 测量得到的可见尺寸，布局输出必须保持此尺寸 */
  size: FlowLayoutSize;
  /** 元素周围用于避让的外边距，使用用户单位 */
  margin: Readonly<BoundsInsets>;
}>;

/** 已测量的递归 Flow Group 输入 */
export type FlowLayoutGroupInput = Readonly<{
  /** 带可见外壳分组的输入判别字段 */
  kind: 'group';
  /** 作者指定的分组 id，与输出 id 对应 */
  id: string;
  /** 最近 Flow 作用域内的可选层级约束，省略时由布局决定 */
  rank?: number;
  /** 已测量外壳所需的最小尺寸，输出不能小于此值 */
  minimumSize: FlowLayoutSize;
  /** 外壳边界到可放置内容区域的内缩，含标题与内边距 */
  contentInsets: Readonly<BoundsInsets>;
  /** 此分组已补全的方向、间距与路由配置 */
  layout: EffectiveFlowLayout;
  /** 按作者直接包含关系组织的已测量子项 */
  elements: ReadonlyArray<FlowLayoutElementInput>;
}>;

/** 作者指定 placement 的递归 Flow Layout 输入 */
export type FlowLayoutContainerInput = Readonly<{
  /** 无可见外壳容器的输入判别字段 */
  kind: 'layout';
  /** 作者指定的容器 id，与输出 id 对应 */
  id: string;
  /** 父 Flow 作用域内的可选层级约束，省略时由布局决定 */
  rank?: number;
  /** 此容器已补全的方向、间距与路由配置 */
  layout: EffectiveFlowLayout;
  /** 作者指定并已补全的 linear 或 grid 排列配置 */
  placement: EffectiveFlowPlacement;
  /** 按作者直接包含关系组织的已测量子项 */
  elements: ReadonlyArray<FlowLayoutElementInput>;
}>;

/** Flow layout element 输入 */
export type FlowLayoutElementInput = FlowLayoutLeafInput | FlowLayoutGroupInput | FlowLayoutContainerInput;

/** 单个 Flow Layout direct child 的已测量 placement 输入 */
export type FlowLayoutPlacementElementInput = Readonly<{
  /** 直接子项的作者 id */
  id: string;
  /** 直接子项已确定的可见尺寸 */
  size: FlowLayoutSize;
  /** 直接子项周围用于避让的外边距 */
  margin: Readonly<BoundsInsets>;
}>;

/** Flow Layout 固定 placement 的完整输入 */
export type FlowLayoutPlacementInput = Readonly<{
  /** 待排列容器的 id 与有效固定排列配置 */
  layout: EffectiveFlowPlacement & Readonly<{ id: string }>;
  /** 该容器全部直接子项的尺寸与外边距 */
  elements: ReadonlyArray<FlowLayoutPlacementElementInput>;
}>;

/** Flow Layout 固定 placement 的完整输出 */
export type FlowLayoutPlacementOutput = Readonly<{
  /** 对外结构边界；排除配置下原点为零，子项允许溢出或使用负坐标 */
  bounds: Readonly<BoundsRect>;
  /** 各直接子项在容器局部坐标系中的位置和尺寸 */
  elements: ReadonlyArray<FlowLayoutElementOutput>;
}>;

/** Flow Layout Definition 调用作者 placement 的同步执行边界 */
export type FlowLayoutExecutionContext = Readonly<{
  /** 按已测量尺寸执行作者的固定排列，返回容器局部坐标中的边界和子项位置 */
  placeLayout: (input: FlowLayoutPlacementInput) => FlowLayoutPlacementOutput;
}>;

/** Flow layout relation 输入 */
export type FlowLayoutRelationInput = Readonly<{
  /** 起点 Entity 或 Group 的作者 id */
  source: string;
  /** 终点 Entity 或 Group 的作者 id */
  target: string;
  /** 已解析的语义箭头方向 */
  direction: RelationDirectionValue;
  /** 已补全参数的关系路由 */
  routing: FlowLayoutRouting;
  /** 已测量的标签尺寸；无标签时省略 */
  labelSize?: FlowLayoutSize;
  /** 完整标签的几何投影；空对象仍表示使用 Core 默认，紧凑标签省略此项 */
  labelPlacement?: FlowLayoutLabelPlacement;
}>;

/** 一次原子 Flow layout callback 的完整输入 */
export type FlowLayoutInput = Readonly<{
  /** 根作用域已补全的方向、间距与路由配置 */
  layout: EffectiveFlowLayout;
  /** 已解析包含关系并测量尺寸的元素树 */
  elements: ReadonlyArray<FlowLayoutElementInput>;
  /** 按 Source 顺序排列的根级关系，输出必须保持相同顺序 */
  relations: ReadonlyArray<FlowLayoutRelationInput>;
}>;

/** 一个 Flow element 的根坐标系布局输出 */
export type FlowLayoutElementOutput = Readonly<{
  /** 对应输入中的作者 id；每个元素、分组和容器都必须返回一次 */
  id: string;
  /** 元素在 Flow 根坐标系中的位置和尺寸，使用用户单位 */
  bounds: Readonly<BoundsRect>;
}>;

/** 一条 Flow relation 的根坐标系布局输出 */
export type FlowLayoutRelationOutput = Readonly<{
  /** 根坐标系中的有判别参考几何 */
  route: FlowLayoutRoute;
  /** 标签在 Flow 根坐标系中的预留矩形，倾斜标签使用旋转后的 AABB；有标签时必须提供，无标签时必须省略 */
  labelBounds?: Readonly<BoundsRect>;
}>;

/** 一次原子 Flow layout callback 的完整输出 */
export type FlowLayoutOutput = Readonly<{
  /** 所有输入元素的扁平几何列表，通过 id 与元素树对应 */
  elements: ReadonlyArray<FlowLayoutElementOutput>;
  /** 与输入关系逐项对应的路径及标签预留区域 */
  relations: ReadonlyArray<FlowLayoutRelationOutput>;
}>;

/** Layout Definition 对结构、方向与路由的权威保证 */
export type FlowLayoutCapabilities = Readonly<{
  /** 支持的固定排列种类，必须非空且无重复 */
  placementKinds: ReadonlyArray<FlowPlacementKindValue>;
  /** 是否支持包含嵌套 Group 或 Layout 的复合作用域 */
  compoundScopes: boolean;
  /** 是否允许 Group 作为关系端点；启用时必须同时支持 compoundScopes */
  groupEndpoints: boolean;
  /** 是否支持跨作用域关系；启用时必须同时支持 compoundScopes */
  crossScopeRelations: boolean;
  /** 是否支持有向环 */
  cycles: boolean;
  /** 是否支持起点与终点相同的关系 */
  selfLoops: boolean;
  /** 是否支持相同起点和终点之间的多条关系 */
  parallelRelations: boolean;
  /** 是否支持关系标签的空间预留 */
  relationLabels: boolean;
  /** 支持的语义箭头方向，必须非空且无重复 */
  relationDirections: ReadonlyArray<RelationDirectionValue>;
  /** 支持的路由种类，必须非空且无重复 */
  routingKinds: ReadonlyArray<FlowRoutingKindValue>;
}>;

/** 同步确定 Flow element bounds、relation route 与 label reservation 的布局定义 */
export type FlowLayoutDefinition = Readonly<{
  /** 唯一且非空的注册名称，供 defaultFlowLayout 选择 */
  name: string;
  /** 非空的布局用途说明，供目录、工具和 LLM 查询 */
  description: string;
  /** 此布局支持的结构、箭头方向与路由；布局前据此检查输入 */
  capabilities: FlowLayoutCapabilities;
  /** Source 和祖先配置均未指定时采用的方向、间距与路由 */
  defaults: FlowLayoutDefaults;
  /** 测量完成后同步计算几何；为全部元素返回 bounds，按输入顺序返回关系；每个固定 Layout 必须调用 context.placeLayout 一次 */
  layout: (input: FlowLayoutInput, context: FlowLayoutExecutionContext) => FlowLayoutOutput;
}>;

/** 向 LLM 与工具描述当前真实 Flow layout registry 的 JSON-safe 项 */
export type FlowLayoutCatalogEntry = Readonly<
  Pick<FlowLayoutDefinition, 'name' | 'description' | 'capabilities' | 'defaults'> & {
    /** 是否为当前目录选中的默认布局 */
    isDefault: boolean;
  }
>;

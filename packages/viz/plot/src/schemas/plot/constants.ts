/** plot 基础 namespace。 */
export const PLOT_NAMESPACE = 'plot';

/** plot namespace 内的 composite 类型关键字。 */
export const PlotComposite = {
  /** 顶层 grammar-of-graphics spec 节点。 */
  Plot: 'plot',
} as const;

/** 分面空面板生成策略。 */
export const FacetEmptyPolicy = {
  /** 只生成至少包含一行数据的面板。 */
  Drop: 'drop',
  /** 生成所有 row x column 面板组合。 */
  Show: 'show',
} as const;

/** 分面 scale domain 共享模式。 */
export const FacetScaleSharing = {
  /** 使用所有分面面板的数据训练对应 role 的 scale。 */
  Shared: 'shared',
  /** 使用每个面板自己的局部数据训练对应 role 的 scale。 */
  Independent: 'independent',
} as const;

/** 坐标组合中的比例尺解析模式。 */
export const CompositionScaleResolve = {
  /** 匹配的坐标视图复用同一个比例尺身份和定义域。 */
  Shared: 'shared',
  /** 每个坐标视图使用自己的局部数据定义域。 */
  Independent: 'independent',
  /** 保留独立比例尺身份，但使用同步后的联合定义域训练。 */
  Synchronized: 'synchronized',
} as const;

/** 坐标组合中的坐标轴输出模式。 */
export const CompositionAxisResolve = {
  /** 在坐标轴绑定的坐标视图上绘制。 */
  Local: 'local',
  /** 在可收敛的组合结构中只绘制外侧轴。 */
  Outer: 'outer',
  /** 不输出该角色的坐标轴。 */
  None: 'none',
} as const;

/** 坐标组合中的网格投放模式。 */
export const CompositionGridResolve = {
  /** 只把网格线投放到坐标轴绑定的坐标视图。 */
  Local: 'local',
  /** 把网格线投放到组合结构选中的所有坐标视图。 */
  All: 'all',
  /** 不为该角色做默认网格投放。 */
  None: 'none',
} as const;

/** 轨道组合结构的 frame 共享模式。 */
export const ScaffoldFrameMode = {
  /** 共享基础组合结构 frame 和 bounding box。 */
  Shared: 'shared',
  /** 复用轨道组合结构注册表，但每个轨道独立解析 frame。 */
  Independent: 'independent',
} as const;

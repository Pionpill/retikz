/** 单轴容器尺寸策略 */
export const LayoutAxisSizeKind = {
  /** 根据内容贡献确定尺寸 */
  Content: 'content',
  /** 使用作者指定的固定尺寸 */
  Fixed: 'fixed',
  /** 填充父布局提供的有限空间 */
  Fill: 'fill',
} as const;

/** 布局项目所属的容器种类 */
export const LayoutItemKind = {
  /** Flex 容器 */
  Flex: 'flex',
  /** Grid 容器 */
  Grid: 'grid',
  /** Overlay 容器 */
  Overlay: 'overlay',
} as const;

/** 物理轴上的项目对齐方式 */
export const LayoutAlignment = {
  /** 与起始边对齐 */
  Start: 'start',
  /** 与轴中心对齐 */
  Center: 'center',
  /** 与结束边对齐 */
  End: 'end',
  /** 拉伸以填满可用空间 */
  Stretch: 'stretch',
  /** 与首行基线对齐 */
  FirstBaseline: 'first-baseline',
  /** 与末行基线对齐 */
  LastBaseline: 'last-baseline',
} as const;

/** 剩余空间分布方式 */
export const LayoutDistribution = {
  /** 将剩余空间放在末尾 */
  Start: 'start',
  /** 将剩余空间均分到两端 */
  Center: 'center',
  /** 将剩余空间放在起始侧 */
  End: 'end',
  /** 拉伸项目以填满剩余空间 */
  Stretch: 'stretch',
  /** 仅在项目之间分配剩余空间 */
  SpaceBetween: 'space-between',
  /** 在项目两侧分配剩余空间 */
  SpaceAround: 'space-around',
  /** 在项目及两端均匀分配剩余空间 */
  SpaceEvenly: 'space-evenly',
} as const;

/** 容器视觉溢出策略 */
export const LayoutOverflow = {
  /** 保留容器边界外的可见内容 */
  Visible: 'visible',
  /** 裁剪容器边界外的可见内容 */
  Clip: 'clip',
} as const;

/** GridLayout 布局产物中轨道的定义尺寸来源 */
export const LayoutTrackSourceKind = {
  /** 固定轨道尺寸 */
  Fixed: 'fixed',
  /** 根据内容最小尺寸确定轨道 */
  ContentMinimum: 'content-minimum',
  /** 根据内容自然尺寸确定轨道 */
  ContentNatural: 'content-natural',
  /** 根据剩余空间比例确定轨道 */
  Fraction: 'fraction',
  /** 根据最小值和最大值共同确定轨道 */
  Minmax: 'minmax',
} as const;

/** 布局产物中间距区域的语义种类 */
export const LayoutSpacingKind = {
  /** 项目之间的固定间距 */
  Gap: 'gap',
  /** 由布局规则分配出的间距 */
  Distributed: 'distributed',
} as const;

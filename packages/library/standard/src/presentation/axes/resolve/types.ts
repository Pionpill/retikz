import type { IRAxes } from '..';

type Axis = IRAxes['x'];

type Ticks = Exclude<Axis['ticks'], false | undefined>;

type TickSpacing = Extract<Ticks['source'], { kind: 'spacing' }>;

type AxisLabel = Extract<Axis['label'], { text: unknown }>;

type Origin = NonNullable<IRAxes['origin']>;

type OriginLabel = Extract<Origin['label'], { text: unknown }>;

/** 已确定默认值的刻度配置 */
export type CanonicalAxesTicks = Omit<Ticks, 'source' | 'labels' | 'side' | 'length' | 'endpointGap'> & {
  /** 刻度位置来源；按间隔生成时已补齐全部必需参数 */
  source: Exclude<Ticks['source'], TickSpacing> | Required<TickSpacing>;
  /** 刻度线相对轴线的已解析侧向 */
  side: NonNullable<Ticks['side']>;
  /** 刻度线在绘图坐标中的长度 */
  length: number;
  /** 刻度与轴端点之间保留的距离 */
  endpointGap: number;
  /** 刻度标签配置；启用时已确定偏移，false 表示关闭 */
  labels?:
    | false
    | (Exclude<Ticks['labels'], false | undefined> & {
        /** 刻度端点到标签中心的间距 */
        offset: number;
      });
};

/** 已展开轴长和标签简写的单轴配置 */
export type CanonicalAxesAxis = Omit<Axis, 'extent' | 'line' | 'label' | 'ticks' | 'grid'> & {
  /** 已将简写展开为明确范围的轴端点配置 */
  extent: Exclude<Axis['extent'], number>;
  /** 关闭轴线，或已补齐端点箭头的轴线配置 */
  line:
    | false
    | (Exclude<Axis['line'], false | undefined> & {
        /** 轴线两端采用的箭头配置 */
        arrows: NonNullable<Exclude<Axis['line'], false | undefined>['arrows']>;
      });
  /** 关闭轴标题，或已确定所在端点及偏移的标题配置 */
  label:
    | false
    | (AxisLabel & {
        /** 轴标题放置的轴端 */
        end: NonNullable<AxisLabel['end']>;
        /** 轴标题中心超出所选轴端的距离 */
        offset: number;
      });
  /** 该轴的刻度配置；false 表示关闭 */
  ticks?: false | CanonicalAxesTicks;
  /** 随该轴刻度生成的网格线配置；启用时已确定偏移 */
  grid?:
    | false
    | (Exclude<Axis['grid'], false | undefined> & {
        /** 该轴局部数学坐标中的网格格点对齐原点 */
        offset: number;
      });
};

/** 下沉所需的完整 Axes 配置 */
export type CanonicalAxes = Omit<IRAxes, 'x' | 'y' | 'origin'> & {
  /** 横轴的已解析呈现配置 */
  x: CanonicalAxesAxis;
  /** 纵轴的已解析呈现配置 */
  y: CanonicalAxesAxis;
  /** 已确定位置及原点标签偏移的原点配置 */
  origin: Origin & {
    /** 两个坐标轴交点的已确定位置 */
    position: NonNullable<Origin['position']>;
    /** 原点标签配置，false 表示关闭 */
    label:
      | false
      | (OriginLabel & {
          /** 原点标签中心相对原点的对角偏移量 */
          offset: number;
        });
  };
};

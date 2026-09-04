import type {
  IRPlotBandScale,
  IRPlotDomainPadding,
  IRPlotLogScale,
  IRPlotPointScale,
  IRPlotSymlogScale,
} from '@retikz/plot';

/** 位置 scale 可配置的坐标维度 */
export type InputPlotScaleDimension = 'x' | 'y';

/** React DSL 里当前暴露的位置 scale 类型 */
export type InputPlotPositionScaleType = 'linear' | 'time' | 'band' | 'point' | 'log' | 'sqrt' | 'symlog' | 'radial';

/** 支持连续 domain 配置的位置 scale 类型 */
export type InputPlotContinuousPositionScaleType = Exclude<InputPlotPositionScaleType, 'band' | 'point'>;

/** React DSL 中暴露的 position scale domain padding 输入 */
export type InputDomainPadding = IRPlotDomainPadding;

/** <PlotScale> 公共 props：声明某个坐标维度使用的 scale 类型 */
type ScaleBaseProps = {
  /** 绑定哪个定位维度；polar 下 x 为角向，y 为径向 */
  dimension: InputPlotScaleDimension;
};

/** 连续位置 scale props */
type ContinuousScaleProps = ScaleBaseProps & {
  /** 显式数值 / 时间 domain；省略时从绑定数据推断 */
  domain?: [number, number];
  /** 额外值域留白；推断与显式 domain 均默认 0 */
  domainPadding?: InputDomainPadding;
  /** 单值 domain 展开跨度；省略时按 scale 类型默认 */
  singleValueSpan?: number;
} & (
    | {
        /** 对数位置 scale */
        type: 'log';
        /** 对数底数；省略时为 10 */
        base?: IRPlotLogScale['base'];
        constant?: never;
      }
    | {
        /** 对称对数位置 scale */
        type: 'symlog';
        base?: never;
        /** 线性区宽度常数；省略时为 1 */
        constant?: IRPlotSymlogScale['constant'];
      }
    | {
        /** 除 log / symlog 外的连续位置 scale */
        type: Exclude<InputPlotContinuousPositionScaleType, 'log' | 'symlog'>;
        base?: never;
        constant?: never;
      }
  );

/** 分类点位 scale props */
type PointScaleProps = ScaleBaseProps & {
  /** 分类点位 scale 类型；不接受连续 domain 配置 */
  type: 'point';
  /** 显式分类 domain；省略时按数据出现顺序推断 */
  domain?: IRPlotPointScale['domain'];
  /** 首尾外侧留白占 step 的比例；省略时为 0.5 */
  padding?: IRPlotPointScale['padding'];
  /** 首尾留白在范围两端的分配方式；省略时为 0.5 */
  align?: IRPlotPointScale['align'];
};

/** 分类带宽 scale props */
type BandScaleProps = ScaleBaseProps & {
  /** 分类带宽 scale 类型 */
  type: 'band';
  /** 显式分类 domain；省略时按数据出现顺序推断 */
  domain?: IRPlotBandScale['domain'];
  /** 相邻 band 间距占 step 的比例；省略时为 0.1 */
  paddingInner?: IRPlotBandScale['paddingInner'];
  /** 首尾外侧留白占 step 的比例；省略时等于 paddingInner */
  paddingOuter?: IRPlotBandScale['paddingOuter'];
  /** 首尾留白在范围两端的分配方式；省略时为 0.5 */
  align?: IRPlotBandScale['align'];
};

/** <PlotScale> props：声明某个坐标维度使用的 scale 类型 */
export type InputPlotScale = ContinuousScaleProps | BandScaleProps | PointScaleProps;

/**
 * 位置 scale 声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 IRPlot.scales
 */

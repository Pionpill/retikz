import type { IRAxes } from '..';

type Axis = IRAxes['x'];
type Ticks = Exclude<Axis['ticks'], false | undefined>;
type TickSpacing = Extract<Ticks['source'], { kind: 'spacing' }>;
type AxisLabel = Extract<Axis['label'], { text: unknown }>;
type Origin = NonNullable<IRAxes['origin']>;
type OriginLabel = Extract<Origin['label'], { text: unknown }>;

/** 已确定默认值的刻度配置 */
export type CanonicalAxesTicks = Omit<Ticks, 'source' | 'labels' | 'side' | 'length' | 'endpointGap'> & {
  source: Exclude<Ticks['source'], TickSpacing> | Required<TickSpacing>;
  side: NonNullable<Ticks['side']>;
  length: number;
  endpointGap: number;
  labels?: false | (Exclude<Ticks['labels'], false | undefined> & { offset: number });
};

/** 已展开轴长和标签简写的单轴配置 */
export type CanonicalAxesAxis = Omit<Axis, 'extent' | 'line' | 'label' | 'ticks' | 'grid'> & {
  extent: Exclude<Axis['extent'], number>;
  line:
    | false
    | (Exclude<Axis['line'], false | undefined> & {
        arrows: NonNullable<Exclude<Axis['line'], false | undefined>['arrows']>;
      });
  label: false | (AxisLabel & { end: NonNullable<AxisLabel['end']>; offset: number });
  ticks?: false | CanonicalAxesTicks;
  grid?: false | (Exclude<Axis['grid'], false | undefined> & { offset: number });
};

/** 下沉所需的完整 Axes 配置 */
export type CanonicalAxes = Omit<IRAxes, 'x' | 'y' | 'origin'> & {
  x: CanonicalAxesAxis;
  y: CanonicalAxesAxis;
  origin: Origin & {
    position: NonNullable<Origin['position']>;
    label: false | (OriginLabel & { offset: number });
  };
};

import { extent } from 'd3-array';
import { type ScaleLinear, scaleLinear } from 'd3-scale';

/** 归一化求值函数：数据值 → 坐标值（投影器消费的窄接口；d3 ScaleLinear 结构上满足） */
export type LinearScaleFn = (value: number) => number;

/** 默认目标刻度数（d3 ticks 的提示值，非硬约束——实际数量按 nice 区间取整定） */
export const DEFAULT_TICK_COUNT = 5;

/** 一组刻度：值 + 对应格式化标签（d3 tickFormat 产出） */
export type TickSet = { values: Array<number>; labels: Array<string> };

/** 从一组数值求 [min, max]；空集 / 全非有限回退 [0, 1]（d3 extent 对空集返回 [undefined, undefined]） */
const safeExtent = (values: Array<number>): [number, number] => {
  // d3 extent 空集返回 [undefined, undefined]（相关元组：lo 为 undefined 则 hi 必然也是）
  const [lo, hi] = extent(values);
  return lo === undefined ? [0, 1] : [lo, hi];
};

/**
 * 建轴的线性 scale（d3 scaleLinear）
 * @description domain 缺省时从绑定数据值推断（d3 extent）；range 缺省时用 fallback（坐标系尺寸给）。
 *   返回 d3 ScaleLinear：可作 `(value) => number` 投影，也可 `.ticks()` / `.tickFormat()` / `.range([...])` 后续设值。
 *   单值 domain（d0=d1）d3 归一化返回 0.5 → 映射到 range 中点，与早期自写 linear 行为一致。
 */
export const resolveLinearScale = (
  def: { domain?: readonly [number, number]; range?: readonly [number, number]; nice?: boolean; clamp?: boolean },
  values: Array<number>,
  fallbackRange: readonly [number, number],
): ScaleLinear<number, number> => {
  const scale = scaleLinear()
    .domain([...(def.domain ?? safeExtent(values))])
    .range([...(def.range ?? fallbackRange)]);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return scale;
};

/**
 * 取一个 scale 的刻度值 + 格式化标签
 * @description 刻度值 / 标签只依赖 domain + count（与 range 无关）——故可在 range 定下来前先算，供布局估算 margin（ADR-03）。
 *   axis 与同维 grid 复用同一 TickSet（同源）。
 */
export const scaleTicks = (scale: ScaleLinear<number, number>, count: number = DEFAULT_TICK_COUNT): TickSet => {
  const values = scale.ticks(count);
  const format = scale.tickFormat(count);
  return { values, labels: values.map(format) };
};

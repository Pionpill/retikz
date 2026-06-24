import type { IRChild } from '@retikz/core';
import type { ExternalRow, Mark, MarkOperation } from '../schemas';
import type { ChannelDefinitionKindValue, FieldCollector, MarkChannels } from './channel';
import type { Cell, CoordinateFrame } from './coordinate';
import type { MarkProvenance } from './provenance';

/**
 * 区间柱（interval mark）摆放上下文：lowering 与 locator 共享的一次性派生量
 * @description 每 mark 构造一次（buildIntervalContext），随后逐行复用——把 band group 的子带划分
 *   （seriesRank / subWidth）收进一处，杜绝两处各算各的漂移。堆叠经 extent bounds 表达、不再走 ctx。
 */
export type IntervalContext = {
  /** 类别带宽（primary.bandwidth；group 切子带、plain 直接用） */
  bandwidth: number;
  /** band group 子带字段（bounds.x = band{group} 时有值；否则 undefined = 整带） */
  group?: string;
  /** group 值 → 子带序号（按数据序去重推断，与 lowering 一致） */
  seriesRank: Map<string | number, number>;
  /** 单子带宽（bandwidth / 子带数；无 group 下 = bandwidth） */
  subWidth: number;
};

/**
 * mark lowering 行为注册项（按 type 查找分发；行为函数不进 IR）
 * @description IR schema 仍是 ir/mark.ts 静态单一真源；本接口只承载「某 mark type 怎么下沉成 core IR」的行为，
 *   对齐仓库已有的 composite / coordinate / transform / scale 工厂注册范式。内置与自定义 mark 都经同一 registry 分派。
 */
export type MarkDefinition<T extends MarkOperation = Mark> = {
  /** 注册键（= IR 判别串；内置对应 ir/mark.ts 静态 schema 的成员，自定义为任意非内置串） */
  type: string;
  /** 收集该 mark 额外引用的用户源字段；通用 encoding / label 字段由 data 层统一处理 */
  collectFields?: (mark: T, fields: FieldCollector) => void;
  /**
   * 声明该 mark 能消费哪些通道交付面。
   * @description channel registry 会据此只解析 mark 实际会下沉的 channel definition。比如 point 可消费 mark / scope / node
   *   通道，path 可消费 mark / scope / path 通道；自定义 mark 应按自己的 lowering 产物声明，避免 channel 层写死 mark type。
   */
  channelKinds?: (mark: T) => ReadonlySet<ChannelDefinitionKindValue>;
  /** 区间类 mark：某行 → 正交 Cell（interval 用；非区间类省略） */
  buildCell?: (mark: T, row: ExternalRow, frame: CoordinateFrame, ctx?: IntervalContext) => Cell | null;
  /** 下沉到 core IR 图层（无可绘制图元返回 null；不支持的 mark × coordinate 由实现 fail-loud） */
  lower: (mark: T, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, prov?: MarkProvenance) => IRChild | null;
};

/**
 * 定义一个 mark definition。
 * @description 保留 collectFields / buildCell / lower 之间对 mark 子类型的强类型关联；内置与自定义 mark 都经同一 registry 入口分派。
 */
export const defineMark = <T extends MarkOperation = Mark>(def: MarkDefinition<T>): MarkDefinition<T> => def;

/**
 * registry 内部使用的宽类型。
 * @description registry 需要存放不同 mark 子类型的 definition；真正调用前由 lowerMark 按 type 取出，行为函数入参用 never 防误调。
 */
export type AnyMarkDefinition = Omit<MarkDefinition<Mark>, 'collectFields' | 'buildCell' | 'lower'> & {
  /** 内部宽类型占位；按 type 取出后调用方已知具体 mark。 */
  collectFields?: (mark: never, fields: FieldCollector) => void;
  /** 内部宽类型占位；语义同 MarkDefinition.channelKinds，供 registry 按 type 分发后调用。 */
  channelKinds?: (mark: never) => ReadonlySet<ChannelDefinitionKindValue>;
  /** 内部宽类型占位；按 type 取出后调用方已知具体 mark。 */
  buildCell?: (mark: never, row: ExternalRow, frame: CoordinateFrame, ctx?: IntervalContext) => Cell | null;
  /** 内部宽类型占位；按 type 取出后调用方已知具体 mark。 */
  lower: (mark: never, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, prov?: MarkProvenance) => IRChild | null;
};

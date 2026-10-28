import type { ExternalRow } from '@retikz/data';

/** 下沉、位置调整与域留白共同消费的实例来源 */
export type InputMarkInstance = { kind: 'single' } | { kind: 'rows'; rows: Array<ExternalRow> };

/** 单个几何目标的真实实例身份，独立实例没有数据行 */
export type MarkInstance = { kind: 'single' } | { kind: 'row'; row: ExternalRow; transformedIndex: number };

/** 将实例来源展开为稳定有序的几何消费目标，空结果保持为空 */
export const markInstances = (input: InputMarkInstance): Array<MarkInstance> =>
  input.kind === 'single'
    ? [{ kind: 'single' }]
    : input.rows.map((row, transformedIndex) => ({ kind: 'row', row, transformedIndex }));

/** 取得声明内稳定的实例键，独立实例不借用行索引 */
export const markInstanceKey = (instance: MarkInstance): string =>
  instance.kind === 'single' ? 'single' : String(instance.transformedIndex);

/**
 * 区间柱（interval mark）摆放上下文：lowering 与 locator 共享的一次性派生量
 * @description 每 mark 构造一次（buildIntervalContext），随后逐行复用——把 band group 的子带划分
 *   （seriesRank / subWidth）收进一处，杜绝两处各算各的漂移。堆叠经 extent bounds 表达、不再走 ctx
 */
export type IntervalContext = {
  /** 按 role 保存的 band 子带上下文；仅 interval lowering / locator 共享，不进 IR */
  byRole: Partial<
    Record<
      string,
      {
        /** 类别带宽（group 切子带、plain 直接用） */
        bandwidth: number;
        /** band group 子带字段（bounds.<role> = band{group} 时有值；否则 undefined = 整带） */
        group?: string;
        /** group 值 → 子带序号（按数据序去重推断，与 lowering 一致） */
        seriesRank: Map<string | number, number>;
        /** 单子带宽（bandwidth / 子带数；无 group 下 = bandwidth） */
        subWidth: number;
      }
    >
  >;
  /** 按 role 保存的比例宽度累积区间；供 variable-width interval lowering / locator 共享，不进 IR */
  proportionalByRole?: Partial<Record<string, Map<ExternalRow, [number, number]>>>;
};

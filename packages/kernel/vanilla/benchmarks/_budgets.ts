import type { BenchmarkBudget, BenchmarkScenario } from '../../../../scripts/benchmarks/types';

/** 按实际操作分配消费预算，不能把所有第二帧都视作增量交互 */
export const resolveVanillaBudget = ({
  id,
  dimensions,
}: Pick<BenchmarkScenario, 'id' | 'dimensions'>): BenchmarkBudget => {
  const group = dimensions?.[0];
  const operation = id.split(' > ').at(-1)?.split('/')[0];
  const primaryCount = () => {
    const count = Number.parseInt(dimensions?.at(-1) ?? '', 10);
    if (!(count > 0)) throw new Error('缺少预算规模：' + id);
    return count;
  };
  const completeFrame =
    group === '全量编译（SSR 字符串）' ||
    group === '增量编译（浏览器初始帧）' ||
    group === '增量编译（无宿主初始帧）' ||
    ((group === '增量更新（batch）' || group === '会话') &&
      ['mount', 'replace', 'equal', 'replace-subscribed'].includes(operation ?? ''));
  if (completeFrame) {
    // 规模以表中首项主体数为准，Scope 的支撑节点与混合图内的边不重复计档
    const count = primaryCount();

    const [warningMs, errorMs] =
      count <= 100 ? [8, 16.6] : count <= 500 ? [25, 50] : count <= 1000 ? [50, 100] : [200, 500];
    return {
      metric: 'p50',
      kind: 'workload',
      warningMs,
      errorMs,
      rationale:
        '整图响应目标按主体数分档：百级争取一帧内完成，中型允许跨帧，千级目标百毫秒内完成，万级大图以半秒为错误线；各后端同档，不按实测耗时倒推',
    };
  }
  if (group === '增量更新（batch）' || group === '会话') {
    if (!['update', 'remove', 'remove-subscribed', 'move-middle'].includes(operation ?? ''))
      throw new Error('未分类的会话或出图操作：' + id);
    const count = primaryCount();
    const [warningMs, errorMs] = count <= 100 ? [8, 16.6] : count <= 1000 ? [16.6, 33.3] : [33.3, 50];
    return {
      metric: 'p50',
      kind: 'workload',
      warningMs,
      errorMs,
      rationale:
        '局部交互按场景主体数规划：百级争取一帧内完成，千级以两帧为错误线，更大规模以三帧为错误线；不沿用整图预算',
    };
  }
  return {
    metric: 'p50',
    kind: 'workload',
    warningMs: 2,
    errorMs: 8,
    rationale: '输入准备与宿主接线只占交互帧的一部分',
  };
};

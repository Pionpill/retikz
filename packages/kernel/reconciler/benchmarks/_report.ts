import type { BenchmarkReport } from '../../../../scripts/benchmarks/types';

/** 同一报告内的成对结果；缺失或失败不产生比值，不跨轮拼接 */
export const formatReconcilerComparison = (report: BenchmarkReport): string => {
  const scenarios = new Map(report.scenarios.map(scenario => [scenario.id.split(' > ').at(-1), scenario]));
  const lines = [
    '\n## 首次编译模式对比',
    '',
    '两侧均计创建、mount 与结果返回；dispose 在计时外。新会话经过预热，不代表冷启动。差值是总成本差，不是某个阶段耗时。单位 ms。',
    '',
    '| 场景 | 非增量均值 | 增量首屏均值 | 均值差 | 均值倍率 | 非增量P90 | 增量首屏P90 | P90差 | P90倍率 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  const paired = (first: string, second: string) => {
    const left = scenarios.get(first);
    const right = scenarios.get(second);
    if (left?.execution !== 'passed' || right?.execution !== 'passed' || !left.statistics || !right.statistics)
      return ['—', '—', '—', '—', '—', '—', '—', '—'].join(' | ');
    const a = left.statistics;
    const b = right.statistics;
    const ratio = (numerator: number, denominator: number) =>
      denominator > 0 ? `${(numerator / denominator).toFixed(2)}×` : '—';
    return [
      a.mean.toFixed(1),
      b.mean.toFixed(1),
      (b.mean - a.mean).toFixed(1),
      ratio(b.mean, a.mean),
      a.p90.toFixed(1),
      b.p90.toFixed(1),
      (b.p90 - a.p90).toFixed(1),
      ratio(b.p90, a.p90),
    ].join(' | ');
  };
  const mounts = new Set(
    [...scenarios.keys()].flatMap(id => id?.match(/^reconciler\/(full|mount)\/(.+)$/)?.slice(2) ?? []),
  );
  for (const key of mounts) lines.push(`| ${key} | ${paired(`reconciler/full/${key}`, `reconciler/mount/${key}`)} |`);
  lines.push(
    '',
    '## 增量更新策略对比',
    '',
    'auto 与强制 full 是独立的增量会话。full/auto 倍率大于 1 表示 auto 更快；不能将它等同非增量首次编译。缺失、未执行或失败的配对以 — 表示。单位 ms。',
    '',
    '| 场景 | auto均值 | full均值 | 均值差 | full/auto均值 | autoP90 | fullP90 | P90差 | full/auto P90 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  );
  const updates = new Set(
    [...scenarios.keys()].flatMap(id => id?.match(/^reconciler\/update\/(.+)\/(auto|full)$/)?.slice(1, 2) ?? []),
  );
  for (const key of updates)
    lines.push(`| ${key} | ${paired(`reconciler/update/${key}/auto`, `reconciler/update/${key}/full`)} |`);
  lines.push(
    '',
    '## 更新工作量（独立计时外验证）',
    '',
    '编译元素数是 trace 的 element-compile 工作量，不是访问总数、缓存命中率或阶段耗时。A/B 为两个真实状态；等值与空批次例外。',
    '',
    '| 场景/策略 | A元素数 | B元素数 | 直接变化元素数 | 正向操作数 | 反向操作数 | 正向编译数 | 反向编译数 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  );
  for (const [id, scenario] of scenarios) {
    const observation = scenario.measurement?.observations;
    if (observation)
      lines.push(
        `| ${id} | ${['elementsA', 'elementsB', 'changedElements', 'operationsForward', 'operationsBackward', 'compiledForward', 'compiledBackward'].map(key => observation[key] ?? '—').join(' | ')} |`,
      );
  }
  return `${lines.join('\n')}\n`;
};

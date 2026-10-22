import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { BenchmarkReport, BudgetAssessment } from './types';

/** 将报告中的外部文本作为纯文本展示，避免被解释为 HTML */
const escapeCell = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('|', '&#124;')
    .replace(/\r?\n/g, ' ');

/** 根据原始毫秒值选择单位，四舍五入保留一位小数，不改变统计和预算判断 */
const formatDuration = (value: number | undefined): string => {
  if (value === undefined) return '—';
  if (value < 1) return `${(value * 1000).toFixed(1)} μs`;
  if (value < 1000) return `${value.toFixed(1)} ms`;
  return `${(value / 1000).toFixed(1)} s`;
};

/** 上限只显示数值与单位；同单位的双阈值共用末尾单位 */
const formatLimit = (assessment: BudgetAssessment): string => {
  if (assessment.warningMs === undefined || assessment.errorMs === undefined)
    return formatDuration(assessment.limitMs).replace(/\.0(?= )/g, '');
  const warning = formatDuration(assessment.warningMs).replace(/\.0(?= )/g, '');
  const error = formatDuration(assessment.errorMs).replace(/\.0(?= )/g, '');
  const unit = error.slice(error.lastIndexOf(' '));
  return warning.endsWith(unit) ? `${warning.slice(0, -unit.length)} / ${error}` : `${warning} / ${error}`;
};

/** 样本数按十进制 K/M 缩写，原始数量仍保存在 JSON 中 */
const formatSamples = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

/** 展示统计与性能验收；用例执行通过不等于性能达标 */
export const formatReport = (report: BenchmarkReport, title = '单元性能测试报告'): string => {
  const executionLabels = { passed: '通过', failed: '失败', skipped: '已跳过', pending: '未执行' };
  const assessmentLabels = {
    'report-only': '仅报告',
    passed: '达标',
    exceeded: '超限',
    'not-comparable': '不可比较',
    'execution-failed': '执行失败',
  };
  const severityLabels = { warn: '🟡 警告', error: '🔴 错误' };
  const rationales = [
    ...new Set(report.scenarios.flatMap(({ assessment }) => (assessment.rationale ? [assessment.rationale] : []))),
  ];
  const errors = report.scenarios.filter(
    ({ assessment }) =>
      assessment.status === 'execution-failed' || (assessment.status === 'exceeded' && assessment.severity === 'error'),
  );
  const warnings = report.scenarios.filter(
    ({ assessment }) => assessment.status === 'exceeded' && assessment.severity === 'warn',
  );
  const metricLabels = { mean: '均值', p50: 'P50', p90: 'P90', p99: 'P99' };
  const reasonLabels: Record<string, string> = {
    'Scenario failed': '场景执行失败',
    'Scenario did not produce a complete measurement': '场景未产生完整测量数据',
    'Environment mismatch': '执行环境不匹配',
    'Baseline unavailable': '基线不可用',
    'Baseline run failed': '基线运行失败',
    'Baseline environment mismatch': '基线执行环境不匹配',
    'Baseline scenario unavailable or failed': '基线场景不可用或执行失败',
    'Invalid relative budget': '相对预算无效',
    'Baseline duration is zero': '基线耗时为零',
    'Invalid duration limit': '耗时上限无效',
  };
  let previousDimensions: Array<string> = [];
  const rows = report.scenarios.map(scenario => {
    const dimensions = report.dimensionLabels.map((_, index) => scenario.dimensions?.[index] || '—');
    // 只省略连续分组内的重复值；父级变化时子级重新显示，避免跨组空白产生歧义
    const dimensionCells = dimensions.map((value, index) =>
      dimensions.slice(0, index + 1).every((dimension, position) => dimension === previousDimensions[position])
        ? ''
        : escapeCell(value),
    );
    previousDimensions = dimensions;
    const stats = scenario.statistics;
    const durations = [stats?.mean, stats?.p50, stats?.p90, stats?.p99].map(formatDuration);
    const assessment = scenario.assessment;
    const reason = assessment.reason ?? scenario.errors.join('; ');
    const limit = formatLimit(assessment);
    const remarks = [
      !scenario.dimensions || scenario.execution !== 'passed' ? scenario.id : '',
      assessment.status === 'execution-failed' ? '🔴 执行失败' : assessmentLabels[assessment.status],
      assessment.severity && assessment.status !== 'passed' ? severityLabels[assessment.severity] : '',
      assessment.metric
        ? `${metricLabels[assessment.metric]}${assessment.warningMs !== undefined ? '，上限依次为警告 / 错误' : ''}`
        : '',
      assessment.rationale ? `依据${rationales.indexOf(assessment.rationale) + 1}` : '',
      assessment.blocking ? '启用门禁' : '',
      reasonLabels[reason] ?? reason,
      scenario.measurement?.mode === 'reference' ? '参考档：无预热，仅 3 次；分位数不作为稳定性结论' : '',
    ]
      .filter(Boolean)
      .join('；');
    return `| ${dimensionCells.length ? `${dimensionCells.join(' | ')} | ` : ''} ${executionLabels[scenario.execution]} | ${stats ? formatSamples(stats.samples) : '—'} | ${durations.join(' | ')} | ${limit} | ${escapeCell(remarks)} |`;
  });
  return [
    `# ${escapeCell(title)}`,
    '',
    `采样时间：${escapeCell(report.createdAt)}`,
    `提交：${escapeCell(report.source.commit)}；工作区存在未提交改动：${report.source.dirty ? '是' : '否'}；源码 SHA-256：${escapeCell(report.source.sourceHash)}`,
    '',
    '耗时对应模块拥有的一次完整操作；纯算法用例每个样本只调用一次算法，规模表示输入大小或计算精度。样本数是统计测量轮次，不是单次操作内的调用次数。P50 为中位数；P90/P99 使用最近秩法（nearest-rank）计算。“仅报告”不代表性能达标。',
    '环境中的 sampling 为常规档默认值；各场景实际采样配置和含预热的执行次数见 JSON measurement。reference 档关闭预热与异步探测，仅计算 3 次。',
    '耗时按原始值选择单位：小于 1ms 用 μs，小于 1s 用 ms，其余用 s，均四舍五入保留 1 位小数；展示位数不代表实际测量精度。JSON 和预算配置仍使用毫秒。',
    '',
    '## 重点结果',
    '',
    `🔴 错误 ${errors.length} 项；🟡 警告 ${warnings.length} 项；仅报告 ${report.scenarios.filter(({ assessment }) => assessment.status === 'report-only').length} 项。`,
    '业务预算是消费需求的规划标准，不是根据本次结果生成的回归基线；本机超限说明该环境下未满足配置目标，不等同于已测得浏览器卡顿。标红不自动阻断 CI，门禁由配置独立控制。',
    '',
    `| ${['标记', ...report.dimensionLabels.map(escapeCell), '指标', '实测', '上限', '说明'].join(' | ')} |`,
    `| ${['---', ...report.dimensionLabels.map(() => '---'), '---', '---:', '---:', '---'].join(' | ')} |`,
    ...[...errors, ...warnings].map(scenario => {
      const assessment = scenario.assessment;
      const limit =
        assessment.severity === 'warn'
          ? (assessment.warningMs ?? assessment.limitMs)
          : (assessment.errorMs ?? assessment.limitMs);
      const explanation = [
        assessment.status === 'execution-failed'
          ? (assessment.reason ?? scenario.errors.join('; '))
          : limit !== undefined && limit > 0 && assessment.actualMs !== undefined
            ? `超出${assessment.severity === 'warn' ? '警告' : '错误'}上限 ${((assessment.actualMs / limit - 1) * 100).toFixed(1)}%`
            : assessment.reason,
        assessment.rationale ? `依据${rationales.indexOf(assessment.rationale) + 1}` : '',
        !scenario.dimensions ? scenario.id : '',
      ]
        .filter(Boolean)
        .join('；');
      return `| ${[
        assessment.severity === 'warn' ? '🟡 警告' : '🔴 错误',
        ...report.dimensionLabels.map((_, index) => escapeCell(scenario.dimensions?.[index] || '—')),
        assessment.metric ? metricLabels[assessment.metric] : '执行',
        formatDuration(assessment.actualMs),
        formatLimit(assessment),
        escapeCell(explanation),
      ].join(' | ')} |`;
    }),
    '',
    '## 预算依据',
    '',
    ...rationales.map((rationale, index) => `- 依据${index + 1}：${escapeCell(rationale)}`),
    '',
    '## 执行环境',
    '',
    '```json',
    JSON.stringify(report.environment, null, 2),
    '```',
    '',
    '## 测量结果',
    '',
    '维度列的空白表示沿用同一分组上一行的值；“—”表示未提供该维度。',
    '',
    `| ${[...report.dimensionLabels.map(escapeCell), '状态', '样本数', '均值', 'P50', 'P90', 'P99', '上限', '备注'].join(' | ')} |`,
    `| ${[...report.dimensionLabels.map(() => '---'), '---', '---:', '---:', '---:', '---:', '---:', '---', '---'].join(' | ')} |`,
    ...rows,
    '',
    '## 运行错误',
    '',
    ...(report.errors.length ? report.errors.map(error => `- ${escapeCell(error)}`) : ['无']),
    '',
  ].join('\n');
};

/** 每次写入独立目录，保留失败结果且不覆盖历史或基线 */
export const writeReport = async (
  root: string,
  report: BenchmarkReport,
  title = '单元性能测试报告',
): Promise<string> => {
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, `${report.createdAt.replaceAll(':', '-')}-`));
  await writeFile(join(directory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(join(directory, 'report.md'), formatReport(report, title), 'utf8');
  return directory;
};

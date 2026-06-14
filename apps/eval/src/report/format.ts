import { type PassRates, type Report } from './aggregate';

/** 失败明细在 markdown 里最多列多少条（其余折叠成计数说明） */
const MAX_FAILURE_ROWS = 20;

const pct = (n: number): string => `${(n * 100).toFixed(1)}%`;

const ratesRow = (label: string, r: PassRates): string =>
  `| ${label} | ${r.count} | ${pct(r.zodPassRate)} | ${pct(r.compilePassRate)} |`;

const ratesTable = (title: string, groups: Record<string, PassRates>): string => {
  const rows = Object.entries(groups).map(([k, r]) => ratesRow(k, r));
  return [
    `### ${title}`,
    '',
    '| 分组 | 样本 | zod 通过率 | compile 通过率 |',
    '| --- | ---: | ---: | ---: |',
    ...rows,
    '',
  ].join('\n');
};

/** markdown 表格单元转义：reason 里可能含 | 与换行 */
const cell = (s: string): string => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

const failureSection = (report: Report): Array<string> => {
  if (report.failures.length === 0) return [];
  const shown = report.failures.slice(0, MAX_FAILURE_ROWS);
  const rows = shown.map(
    (f) => `| ${f.promptId} | ${f.model} | ${f.kIndex} | ${f.stage} | ${cell(f.reason)} |`,
  );
  const more =
    report.failures.length > shown.length
      ? [`> 另有 ${report.failures.length - shown.length} 条失败未列出。`, '']
      : [];
  return [
    `## 失败明细（前 ${shown.length} 条）`,
    '',
    '| promptId | model | k | stage | reason |',
    '| --- | --- | ---: | --- | --- |',
    ...rows,
    '',
    ...more,
  ];
};

const l2Section = (report: Report): Array<string> => {
  const { l2, assertionFailures } = report;
  if (l2.reached === 0) return [];
  const kindRows = Object.entries(l2.byKind).map(
    ([k, v]) => `| ${k} | ${v.total} | ${pct(v.total === 0 ? 0 : v.passed / v.total)} |`,
  );
  const shown = assertionFailures.slice(0, MAX_FAILURE_ROWS);
  const failRows = shown.map(
    (f) => `| ${f.promptId} | ${f.model} | ${f.kIndex} | ${f.kind} | ${cell(f.actual)} |`,
  );
  const more =
    assertionFailures.length > shown.length
      ? [`> 另有 ${assertionFailures.length - shown.length} 条断言失败未列出。`, '']
      : [];
  return [
    '## L2 语义断言',
    '',
    `- 候选级通过率（全部断言通过）：**${pct(l2.candidatePassRate)}**（${l2.reached} 候选到达 L2，${l2.skipped} 跳过）`,
    `- 断言级通过率：**${pct(l2.assertionPassRate)}**（${l2.assertionsPassed}/${l2.assertionsTotal}）`,
    '',
    '### 按断言类型',
    '',
    '| kind | 断言数 | 通过率 |',
    '| --- | ---: | ---: |',
    ...kindRows,
    '',
    ...(failRows.length > 0
      ? [
          '### 断言失败明细',
          '',
          '| promptId | model | k | kind | 实测 |',
          '| --- | --- | ---: | --- | --- |',
          ...failRows,
          '',
          ...more,
        ]
      : []),
  ];
};

export type FormatOptions = { generatedAt: string };

/** 把 Report 渲染成可读 + 可 diff 的 markdown 报告 */
export const formatMarkdown = (report: Report, options: FormatOptions): string =>
  [
    '# retikz eval · 结构有效性(L1) + 语义断言(L2) 报告',
    '',
    `> 生成时间：${options.generatedAt} · 样本总数：${report.total}`,
    '',
    '## 总览（L1）',
    '',
    `- zod 通过率：**${pct(report.overall.zodPassRate)}**`,
    `- compile 通过率：**${pct(report.overall.compilePassRate)}**`,
    '',
    ...l2Section(report),
    '## 分组',
    '',
    ratesTable('按模型', report.byModel),
    ratesTable('按难度', report.byDifficulty),
    '## 失败归因（按 stage）',
    '',
    '| stage | 次数 |',
    '| --- | ---: |',
    `| llm | ${report.failuresByStage.llm} |`,
    `| extract | ${report.failuresByStage.extract} |`,
    `| zod | ${report.failuresByStage.zod} |`,
    `| compile | ${report.failuresByStage.compile} |`,
    '',
    ...failureSection(report),
  ].join('\n');

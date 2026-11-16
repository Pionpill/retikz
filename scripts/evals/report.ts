import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { SchemaCoverageReport } from './coverage';

/** 包提供报告名称与覆盖边界说明，格式和落盘由根工具负责 */
export type SchemaCoverageReportOptions = {
  /** 已有 ignored 报告目录 */
  directory: URL;
  /** 文件名前缀，每次追加时间戳保留历史 */
  name: string;
  /** 报告标题 */
  title: string;
  /** 当前包的已知边界与说明链接 */
  description: string;
};

/** 保存离线配置覆盖清单；不提供模型成绩 */
export const writeSchemaCoverageReport = (
  report: SchemaCoverageReport,
  options: SchemaCoverageReportOptions,
): string => {
  const { directory, name, title, description } = options;
  mkdirSync(directory, { recursive: true });
  const basename = `${name}-${Date.now()}`;
  writeFileSync(
    new URL(`${basename}.json`, directory),
    JSON.stringify({ kind: 'offline-coverage', modelCalls: 0, ...report }, null, 2) + '\n',
    'utf8',
  );
  const rows = report.entries.map(entry => {
    const ids = [...new Set(entry.witnesses.map(witness => witness.caseId))].slice(0, 5).join(', ');
    const text = (entry.description ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
    return `| ${entry.kind} | \`${entry.path}\` | ${entry.status} | ${ids} | ${text} |`;
  });
  const markdown = [
    `# ${title}`,
    '',
    description,
    '',
    `契约 SHA-256：\`${report.contractSha256}\``,
    '',
    'direct 表示参考输入经过该位置且关联实际配置检查；shared 仅复用包声明允许的相同公共字段；diagnostic 不进入评分；gap 必须补齐或显式裁决。',
    '',
    '| 维度 | 代表路径 | 状态 | 用例 | 原始描述 |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
  const path = new URL(`${basename}.md`, directory);
  writeFileSync(path, markdown, 'utf8');
  return fileURLToPath(path);
};

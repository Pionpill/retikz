import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { parse } from 'yaml';

/** 收集 decisions 下的正式 ADR；不扫描实现计划、模板或生成目录 */
const collectAdrs = root => {
  const entries = [];
  const visit = directory => {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, item.name);
      if (item.isDirectory()) visit(absolute);
      else if (/^\d{3,}-.+\.md$/.test(item.name)) {
        const relative = path.relative(root, absolute).split(path.sep).join('/');
        const match = relative.match(
          /^packages\/([^/]+)\/_notes\/decisions\/(?:(.*?)\/)?v\d+\/(v\d+\.\d+)\/\d{3,}-.+\.md$/,
        );
        if (match) entries.push({ path: relative, absolute, owner: match[2] || match[1], version: match[3] });
      }
    }
  };
  for (const group of readdirSync(path.join(root, 'packages'), { withFileTypes: true })) {
    if (!group.isDirectory()) continue;
    const notes = path.join(root, 'packages', group.name, '_notes');
    // 部分分组没有 notes 或 decisions 目录
    let children;
    try {
      children = readdirSync(notes, { withFileTypes: true });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      continue;
    }
    const decisions = children.find(item => item.isDirectory() && item.name === 'decisions');
    if (decisions) visit(path.join(notes, decisions.name));
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path, 'en'));
};

/** 解析并校验外部 Markdown frontmatter，正文不进入检索结果 */
const readAdr = entry => {
  const content = readFileSync(entry.absolute, 'utf8');
  const frontmatter = content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) throw new Error(`${entry.path}: 缺少 ADR frontmatter`);
  let metadata;
  try {
    metadata = parse(frontmatter[1], { uniqueKeys: true, maxAliasCount: 0 });
  } catch (error) {
    throw new Error(`${entry.path}: YAML 无效: ${error.message}`);
  }
  const keywords = typeof metadata?.keywords === 'string' ? metadata.keywords.split('、').map(word => word.trim()) : [];
  if (
    !metadata ||
    typeof metadata.description !== 'string' ||
    !metadata.description.trim() ||
    metadata.description.length > 200 ||
    /[\r\n]/.test(metadata.description) ||
    typeof metadata.keywords !== 'string' ||
    /[\r\n]/.test(metadata.keywords) ||
    keywords.length < 1 ||
    keywords.length > 12 ||
    keywords.some(word => !word || word.length > 80)
  )
    throw new Error(`${entry.path}: description 须为 1–200 字符单行摘要，keywords 须为顿号分隔的 1–12 个单行短关键词`);
  const body = content.slice(frontmatter[0].length);
  const title = body.match(/^#\s+(.+)$/m)?.[1];
  if (!title) throw new Error(`${entry.path}: 缺少 ADR 标题`);
  const status = body.match(/^\s*-\s*状态[：:]\s*(.+)$/m)?.[1] || '未标注';
  return {
    path: entry.path,
    owner: entry.owner,
    version: entry.version,
    title,
    status,
    description: metadata.description,
    keywords,
    body,
  };
};

/** 验证筛选与限量参数，避免拼写错误导致意外全仓搜索 */
const run = () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      owner: { type: 'string' },
      version: { type: 'string' },
      limit: { type: 'string', default: '10' },
      body: { type: 'boolean' },
      json: { type: 'boolean' },
      check: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(
      '用法: pnpm adr:search <关键词...> [--owner diagram] [--version v0.1] [--limit 10] [--body] [--json]\n多词要求全部命中；默认只搜索文件名、标题、摘要和关键词。--body 补查正文，仍只输出摘要。\npnpm adr:search --check 校验全仓 ADR 元数据；不读取实现完成状态、不写索引。',
    );
    return;
  }
  const limit = Number(values.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('--limit 必须为 1–100 的整数');
  if (values.version && !/^v\d+\.\d+$/.test(values.version)) throw new Error('--version 格式为 v0.1');
  const terms = positionals.join(' ').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!values.check && !terms.length) throw new Error('请输入检索关键词；使用 --help 查看用法');
  if (values.check && (terms.length || values.owner || values.version || values.body))
    throw new Error('--check 校验全仓，请勿与查询或范围筛选组合');
  const entries = collectAdrs(process.cwd());
  if (!entries.length) throw new Error('未发现正式 ADR，请在仓库根目录运行');
  if (values.owner && !entries.some(entry => entry.owner === values.owner))
    throw new Error(`未知 owner: ${values.owner}`);
  const selected = entries.filter(
    entry => (!values.owner || entry.owner === values.owner) && (!values.version || entry.version === values.version),
  );
  const records = selected.map(readAdr);
  if (values.check) {
    console.log(`已校验 ${records.length} 篇 ADR 元数据`);
    return;
  }
  const matches = records
    .flatMap(record => {
      const summary = [record.path, record.title, record.description, ...record.keywords].join(' ').toLowerCase();
      const haystack = values.body ? `${summary}\n${record.body.toLowerCase()}` : summary;
      if (!terms.every(term => haystack.includes(term))) return [];
      const score = terms.reduce(
        (sum, term) =>
          sum +
          (record.keywords.some(word => word.toLowerCase() === term) ? 4 : 0) +
          (record.title.toLowerCase().includes(term) ? 2 : 0) +
          (summary.includes(term) ? 1 : 0),
        0,
      );
      return [{ record, score }];
    })
    .sort((a, b) => b.score - a.score || a.record.path.localeCompare(b.record.path, 'en'));
  const results = matches.slice(0, limit).map(({ record }) => ({
    path: record.path,
    owner: record.owner,
    version: record.version,
    title: record.title,
    status: record.status,
    description: record.description,
    keywords: record.keywords,
  }));
  if (values.json) console.log(JSON.stringify({ total: matches.length, limit, results }, null, 2));
  else {
    console.log(`命中 ${matches.length} 篇，显示 ${results.length} 篇${values.body ? '（包含正文搜索）' : ''}`);
    for (const result of results)
      console.log(`\n${result.path}\n${result.title}\n${result.description}\n状态: ${result.status}`);
    if (matches.length > limit) console.log('\n结果已限量；请增加关键词或用 --owner / --version 缩小范围。');
    if (!matches.length && !values.body) console.log('可更换同义词、移除筛选，或用 --body 搜索正文。');
  }
};

try {
  run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

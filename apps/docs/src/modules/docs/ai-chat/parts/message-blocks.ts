import type { RetikzPreviewFormat } from './RetikzPreview';

export type TableAlign = 'left' | 'center' | 'right' | null;

export type ListItem = {
  text: string;
  /** null：普通列表项；boolean：任务列表项（GFM `- [ ]` / `- [x]`） */
  checked: boolean | null;
  children: Array<ListItem>;
};

export type MessageBlock =
  | { type: 'p'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'list'; items: Array<ListItem> }
  | { type: 'h'; level: 1 | 2 | 3; text: string }
  | { type: 'retikz'; format: RetikzPreviewFormat; source: string }
  | { type: 'retikz-pending'; format: RetikzPreviewFormat }
  | { type: 'blockquote'; text: string }
  | { type: 'hr' }
  | { type: 'table'; header: Array<string>; aligns: Array<TableAlign>; rows: Array<Array<string>> };

/** 从 markdown 抽出第一段 ```retikz-tsx``` / ```retikz-ir``` 围栏的内部代码（不含围栏） */
export const extractFirstRetikzBlock = (content: string): { format: 'tsx' | 'ir'; code: string } | null => {
  const m = /```retikz-(tsx|ir)\r?\n([\s\S]*?)\r?\n```/.exec(content);
  if (!m) return null;
  return { format: m[1] as 'tsx' | 'ir', code: m[2] };
};

/** 显式 `| undefined`：让 lang 字符串查表后的"未命中"分支不被 TS 视作死代码 */
const RETIKZ_LANG_FORMAT: Readonly<Record<string, RetikzPreviewFormat | undefined>> = {
  'retikz-ir': 'ir',
  'retikz-tsx': 'tsx',
};

const RE_HEADING = /^(#{1,3})\s+(.*)$/;
const RE_LIST = /^[-*]\s/;
/** 含缩进的列表项；tab 视作 2 空格 */
const RE_LIST_INDENTED = /^(\s*)[-*]\s+/;
/** 任务列表前缀（去掉列表标记后剩下的内容前缀）：`[ ]`、`[x]`、`[X]` */
const RE_TASK_ITEM = /^\[([ xX])\]\s+(.*)$/;
const RE_BLOCKQUOTE = /^>\s?/;
const RE_HR = /^(-{3,}|\*{3,}|_{3,})\s*$/;
/** GitHub table separator：`|---|---|`、`|:---|---:|:---:|` 等，至少 2 列 */
const RE_TABLE_SEPARATOR = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;

/** 拆 `| a | b | c |` 这种行；可省略首尾管道 */
const parseTableRow = (line: string): Array<string> => {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(c => c.trim());
};

const parseTableAligns = (separator: string): Array<TableAlign> =>
  parseTableRow(separator).map(cell => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return null;
  });

const isTableStart = (lines: Array<string>, idx: number): boolean =>
  lines[idx].includes('|') && idx + 1 < lines.length && RE_TABLE_SEPARATOR.test(lines[idx + 1]);

/** 当前行若是列表项（任意缩进），返回其缩进字符数（tab → 2 空格）；否则 null */
const getListIndent = (line: string): number | null => {
  const m = RE_LIST_INDENTED.exec(line);
  if (!m) return null;
  return m[1].replace(/\t/g, '  ').length;
};

/** 把单行列表项的"裸文本"（去掉 `- ` / `* ` 标记后的部分）切成 task 或普通项 */
const buildListItem = (raw: string): ListItem => {
  const taskMatch = RE_TASK_ITEM.exec(raw);
  if (taskMatch) return { text: taskMatch[2], checked: taskMatch[1].toLowerCase() === 'x', children: [] };
  return { text: raw, checked: null, children: [] };
};

/**
 * 从 `start` 开始递归吃下一段同级（缩进 == baseIndent）的列表项；
 * 遇到更深缩进的列表行就递归塞进当前 item.children；遇到更浅缩进或非列表行就停止
 */
const parseListAt = (
  lines: Array<string>,
  start: number,
  baseIndent: number,
): { items: Array<ListItem>; end: number } => {
  const items: Array<ListItem> = [];
  let i = start;
  while (i < lines.length) {
    const indent = getListIndent(lines[i]);
    if (indent === null || indent < baseIndent) break;
    if (indent > baseIndent) break;
    const raw = lines[i].replace(/^\s*[-*]\s+/, '');
    const item = buildListItem(raw);
    i++;
    if (i < lines.length) {
      const nextIndent = getListIndent(lines[i]);
      if (nextIndent !== null && nextIndent > baseIndent) {
        const child = parseListAt(lines, i, nextIndent);
        item.children = child.items;
        i = child.end;
      }
    }
    items.push(item);
  }
  return { items, end: i };
};

/** 段落收集器停止条件：遇到任意块起始或空行就收尾 */
const isBlockStarter = (lines: Array<string>, idx: number): boolean => {
  const line = lines[idx];
  if (line.trim() === '') return true;
  if (line.startsWith('```')) return true;
  if (RE_HEADING.test(line)) return true;
  if (RE_LIST.test(line)) return true;
  if (RE_BLOCKQUOTE.test(line)) return true;
  if (RE_HR.test(line)) return true;
  if (isTableStart(lines, idx)) return true;
  return false;
};

export const parseMessageBlocks = (src: string): Array<MessageBlock> => {
  const lines = src.split('\n');
  const blocks: Array<MessageBlock> = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const start = i + 1;
      let j = start;
      while (j < lines.length && !lines[j].startsWith('```')) j++;
      const closed = j < lines.length;
      const retikzFormat = RETIKZ_LANG_FORMAT[lang];
      if (retikzFormat !== undefined) {
        if (closed) {
          blocks.push({ type: 'retikz', format: retikzFormat, source: lines.slice(start, j).join('\n') });
        } else {
          blocks.push({ type: 'retikz-pending', format: retikzFormat });
        }
      } else {
        blocks.push({ type: 'code', lang: lang || 'text', code: lines.slice(start, j).join('\n') });
      }
      i = j + 1;
      continue;
    }
    const headingMatch = RE_HEADING.exec(line);
    if (headingMatch) {
      blocks.push({ type: 'h', level: headingMatch[1].length as 1 | 2 | 3, text: headingMatch[2] });
      i++;
      continue;
    }
    if (RE_LIST.test(line)) {
      const { items, end } = parseListAt(lines, i, 0);
      blocks.push({ type: 'list', items });
      i = end;
      continue;
    }
    if (RE_BLOCKQUOTE.test(line)) {
      const start = i;
      while (i < lines.length && RE_BLOCKQUOTE.test(lines[i])) i++;
      const text = lines
        .slice(start, i)
        .map(l => l.replace(RE_BLOCKQUOTE, ''))
        .join('\n');
      blocks.push({ type: 'blockquote', text });
      continue;
    }
    if (isTableStart(lines, i)) {
      const header = parseTableRow(lines[i]);
      const aligns = parseTableAligns(lines[i + 1]);
      i += 2;
      const rows: Array<Array<string>> = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', header, aligns, rows });
      continue;
    }
    if (RE_HR.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }
    const pStart = i;
    while (i < lines.length && !isBlockStarter(lines, i)) {
      i++;
    }
    blocks.push({ type: 'p', text: lines.slice(pStart, i).join('\n') });
  }
  return blocks;
};

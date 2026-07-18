import type { IRMathRun, IRTextRun } from '../../schemas';

/** 行内 run（text 或 math）—— parseInlineRuns 产物元素 */
export type IRInlineRun = IRTextRun | IRMathRun;

/** parseInlineRuns 结果 */
export type ParsedInlineRuns = {
  /** 解析出的 run 序列（至少 1 个；纯文本时是单个 text run） */
  runs: Array<IRInlineRun>;
  /** 是否含 math run（false 时调用方可走纯文本快路径，逐字不变） */
  hasMath: boolean;
  /** 是否遇到不闭合的 `$` / `$$`（调用方据此发 TextTexParseError，不抛） */
  warn: boolean;
};

/** run 是否为 math run（结构判别：有 tex 字段） */
export const isMathRun = (run: IRInlineRun): run is IRMathRun => 'tex' in run;

/** 从指定位置查找下一个未转义公式闭合符 */
const findClose = (raw: string, from: number, display: boolean): number => {
  const n = raw.length;
  let i = from;
  while (i < n) {
    const c = raw[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === '$') {
      if (!display) return i;
      if (raw[i + 1] === '$') return i;
      i += 1;
      continue;
    }
    i += 1;
  }
  return -1;
};

/** 把行内文本解析为 text/math run；未开启 TeX 时原样返回文本 */
export const parseInlineRuns = (raw: string, gatingOn: boolean): ParsedInlineRuns => {
  if (!gatingOn) {
    return { runs: [{ text: raw }], hasMath: false, warn: false };
  }
  const runs: Array<IRInlineRun> = [];
  let buf = '';
  let warn = false;
  let hasMath = false;
  const flushText = (): void => {
    if (buf !== '') {
      runs.push({ text: buf });
      buf = '';
    }
  };
  const n = raw.length;
  let i = 0;
  while (i < n) {
    const c = raw[i];
    if (c === '\\' && raw[i + 1] === '$') {
      buf += '$';
      i += 2;
      continue;
    }
    if (c === '$') {
      const display = raw[i + 1] === '$';
      const open = display ? 2 : 1;
      const close = findClose(raw, i + open, display);
      if (close === -1) {
        // 不闭合：该 `$` 起的剩余按字面保留 + warn
        buf += raw.slice(i);
        warn = true;
        break;
      }
      const tex = raw.slice(i + open, close);
      flushText();
      if (tex !== '') {
        runs.push(display ? { tex, displayMode: true } : { tex });
        hasMath = true;
      }
      i = close + open;
      continue;
    }
    buf += c;
    i += 1;
  }
  flushText();
  if (runs.length === 0) runs.push({ text: '' });
  return { runs, hasMath, warn };
};

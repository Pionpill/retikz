import type { IRMathRun } from '../../schemas';
import type { CanonicalInlineRun, ParsedInlineRuns, SourceInlineRun } from './types';

/** 判断 run 是否为公式 run */
export const isMathRun = (run: SourceInlineRun | CanonicalInlineRun): run is IRMathRun => 'tex' in run;

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

/** 把行内文本 shorthand 解析为 text/math run；未开启 TeX 时原样返回文本 */
export const parseInlineRuns = (raw: string, gatingOn: boolean): ParsedInlineRuns => {
  if (!gatingOn) return { runs: [{ text: raw }], hasMath: false, warn: false };
  const runs: Array<SourceInlineRun> = [];
  let buffer = '';
  let warn = false;
  let hasMath = false;
  const flushText = (): void => {
    if (buffer !== '') {
      runs.push({ text: buffer });
      buffer = '';
    }
  };
  let index = 0;
  while (index < raw.length) {
    const character = raw[index];
    if (character === '\\' && raw[index + 1] === '$') {
      buffer += '$';
      index += 2;
      continue;
    }
    if (character === '$') {
      const display = raw[index + 1] === '$';
      const delimiterLength = display ? 2 : 1;
      const close = findClose(raw, index + delimiterLength, display);
      if (close === -1) {
        buffer += raw.slice(index);
        warn = true;
        break;
      }
      const tex = raw.slice(index + delimiterLength, close);
      flushText();
      if (tex !== '') {
        runs.push(display ? { tex, displayMode: true } : { tex });
        hasMath = true;
      }
      index = close + delimiterLength;
      continue;
    }
    buffer += character;
    index += 1;
  }
  flushText();
  if (runs.length === 0) runs.push({ text: '' });
  return { runs, hasMath, warn };
};

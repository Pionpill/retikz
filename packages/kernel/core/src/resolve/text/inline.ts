import type { CanonicalInlineSegment, ParsedInlineSegments, ResolvedMathSegment, SourceInlineSegment } from './types';

/** 判断 segment 是否为公式 segment */
export const isMathSegment = (segment: SourceInlineSegment | CanonicalInlineSegment): segment is ResolvedMathSegment =>
  'tex' in segment;

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

/** 把行内文本 shorthand 解析为 text/math segment；未开启 TeX 时原样返回文本 */
export const parseInlineSegments = (raw: string, gatingOn: boolean): ParsedInlineSegments => {
  if (!gatingOn) return { segments: [{ text: raw }], hasMath: false, warn: false };

  const segments: Array<SourceInlineSegment> = [];
  let buffer = '';
  let warn = false;
  let hasMath = false;

  const flushText = (): void => {
    if (buffer !== '') {
      segments.push({ text: buffer });
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
        segments.push(display ? { tex, displayMode: true } : { tex });
        hasMath = true;
      }

      index = close + delimiterLength;
      continue;
    }

    buffer += character;
    index += 1;
  }

  flushText();
  if (segments.length === 0) segments.push({ text: '' });

  return { segments, hasMath, warn };
};

import type { CanonicalInlineSegment, ParsedInlineSegments, ResolvedMathSegment, SourceInlineSegment } from './types';

/** 判断行内片段是否为公式 */
export const isMathSegment = (segment: SourceInlineSegment | CanonicalInlineSegment): segment is ResolvedMathSegment =>
  'tex' in segment;

/** 从指定位置查找下一个未转义的公式闭合符，未找到时返回 -1 */
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

/**
 * 将字符串中的 $...$ 和 $$...$$ 拆成文字与公式片段
 * @description 未开启公式解析时保留原文本；开启后将转义美元符还原为文字，未闭合分隔符及其后内容保留为文字并标记 warn
 */
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

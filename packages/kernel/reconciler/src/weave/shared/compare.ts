import type { CanonicalTextBlock, InputPaintResolution } from '@retikz/core';
import { compareProperties, jsonStructuralEquals } from '@retikz/foundation';

/** 比较有效绘制资源，图案能力按 Definition 身份判断 */
export const comparePaintResolutions = (
  left: InputPaintResolution | undefined,
  right: InputPaintResolution | undefined,
): boolean => {
  if (left === right) return true;
  if (typeof left !== 'object' || typeof right !== 'object') return false;
  if ('pattern' in left || 'pattern' in right) {
    if (!('pattern' in left) || !('pattern' in right)) return false;
    if (left.pattern.definition !== right.pattern.definition) return false;
  }
  return jsonStructuralEquals(left, right);
};

/** 比较解析后的固定文本层级；测量模式忽略颜色和透明度，不构造投影文本树 */
export const compareTextBlocks = (
  previous: CanonicalTextBlock | undefined,
  current: CanonicalTextBlock | undefined,
  appearance = true,
): boolean => {
  if (previous === current) return true;
  if (previous === undefined || current === undefined) return false;
  if (
    !compareProperties(previous.font, current.font) ||
    previous.textAlign !== current.textAlign ||
    previous.maxTextWidth !== current.maxTextWidth ||
    previous.lineHeight !== current.lineHeight ||
    (appearance && previous.color !== current.color) ||
    previous.lines.length !== current.lines.length
  )
    return false;
  return previous.lines.every((line, index) => {
    const next = current.lines[index];
    if (line === next) return true;
    if (
      line.mixed !== next.mixed ||
      line.plainText !== next.plainText ||
      !compareProperties(line.style?.font, next.style?.font) ||
      (appearance && (line.style?.fill !== next.style?.fill || line.style?.opacity !== next.style?.opacity)) ||
      line.segments.length !== next.segments.length
    )
      return false;
    return line.segments.every((segment, slot) => {
      const after = next.segments[slot];
      if (segment === after) return true;
      // 已类型化片段的字体是唯一对象字段；公式及文字字段直接比较，不展开任意深度
      const keys = new Set([...Object.keys(segment), ...Object.keys(after)]);
      for (const key of keys) {
        if (!appearance && (key === 'fill' || key === 'opacity')) continue;
        if (!compareProperties(Reflect.get(segment, key), Reflect.get(after, key))) return false;
      }
      return true;
    });
  });
};

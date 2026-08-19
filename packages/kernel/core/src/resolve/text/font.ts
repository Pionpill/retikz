import type { FontSizePresetValue, IRFont } from '../../schemas';
import type { CanonicalFont, FontResolveContext, FontSizeResolveContext } from './types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { WebFontSizeRatio } from '../../schemas';

/** 文本默认行高系数 */
export const DEFAULT_TEXT_LINE_HEIGHT_FACTOR = 1.2;

/** 把 IR 字号确定为布局消费的数值 */
export const resolveFontSize = (size: IRFont['size'] | undefined, context: FontSizeResolveContext): number => {
  const { rootFontSize, inheritedFontSize } = context;
  if (!Number.isFinite(rootFontSize) || rootFontSize <= 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `CompileOptions.fontSize must be a positive finite number; received ${rootFontSize}.`,
    );
  }
  if (!Number.isFinite(inheritedFontSize) || inheritedFontSize <= 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `resolveFontSize: inherited font size must be positive and finite; received ${inheritedFontSize}.`,
    );
  }
  if (size === undefined) return inheritedFontSize;
  if (typeof size === 'number') return size;
  if (Object.hasOwn(WebFontSizeRatio, size)) {
    return rootFontSize * WebFontSizeRatio[size as FontSizePresetValue];
  }
  if (size.endsWith('rem')) return Number.parseFloat(size) * rootFontSize;
  if (size.endsWith('em')) return Number.parseFloat(size) * inheritedFontSize;
  throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `resolveFontSize: unsupported font size '${size}'.`);
};

/** 按字段继承并确定字体 */
export const resolveFont = (source: IRFont | undefined, context: FontResolveContext): CanonicalFont => ({
  size: resolveFontSize(source?.size, {
    rootFontSize: context.rootFontSize,
    inheritedFontSize: context.inheritedFont.size,
  }),
  family: source?.family ?? context.inheritedFont.family,
  weight: source?.weight ?? context.inheritedFont.weight,
  style: source?.style ?? context.inheritedFont.style,
});

/** 补齐文本行高默认值 */
export const resolveTextLineHeight = (source: number | undefined, inheritedFontSize: number): number =>
  source ?? inheritedFontSize * DEFAULT_TEXT_LINE_HEIGHT_FACTOR;

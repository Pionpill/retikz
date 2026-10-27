import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { WebFontSizePreset, IRFont } from '../../schemas';
import { webFontSizeRatio } from '../../schemas';
import type { CanonicalFont, FontResolveContext, FontSizeResolveContext } from './types';

/** 文本默认行高系数 */
const DEFAULT_TEXT_LINE_HEIGHT_FACTOR = 1.2;

/**
 * 将字号解析为绘图坐标中的数值
 * @description 缺省时继承当前字号；预设与 rem 相对根字号计算，em 相对继承字号计算，数值直接使用
 * @throws 根字号或继承字号不是有限正数，或字号字符串不受支持时抛出 RetikzCoreError
 */
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
  if (Object.hasOwn(webFontSizeRatio, size)) {
    return rootFontSize * webFontSizeRatio[size as WebFontSizePreset];
  }

  if (size.endsWith('rem')) return Number.parseFloat(size) * rootFontSize;
  if (size.endsWith('em')) return Number.parseFloat(size) * inheritedFontSize;

  throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `resolveFontSize: unsupported font size '${size}'.`);
};

/** 用继承字体补齐缺省字段，并将字号换算为数值 */
export const resolveFont = (source: IRFont | undefined, context: FontResolveContext): CanonicalFont => ({
  size: resolveFontSize(source?.size, {
    rootFontSize: context.rootFontSize,
    inheritedFontSize: context.inheritedFont.size,
  }),
  family: source?.family ?? context.inheritedFont.family,
  weight: source?.weight ?? context.inheritedFont.weight,
  style: source?.style ?? context.inheritedFont.style,
});

/** 返回显式行高，缺省时使用继承字号的 1.2 倍 */
export const resolveTextLineHeight = (source: number | undefined, inheritedFontSize: number): number =>
  source ?? inheritedFontSize * DEFAULT_TEXT_LINE_HEIGHT_FACTOR;

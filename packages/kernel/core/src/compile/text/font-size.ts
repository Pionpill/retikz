import type { FontSizePresetValue, IRFont } from '../../schemas';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { WebFontSizeRatio } from '../../schemas';

export type ResolveFontSizeContext = {
  /** preset 与 rem 的根字号 */
  rootFontSize: number;
  /** em 与缺省值继承的当前字号 */
  inheritedFontSize: number;
};

/** 把 IR 字号输入解析为 compile 阶段消费的 number */
export const resolveFontSize = (size: IRFont['size'] | undefined, context: ResolveFontSizeContext): number => {
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

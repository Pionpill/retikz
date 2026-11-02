import type { TextMeasurer } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/**
 * 兜底文字度量
 * @description 基于平均字宽估算；非法字号会 throw
 */
export const fallbackMeasurer: TextMeasurer = (text, font) => {
  if (!Number.isFinite(font.size) || font.size < 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `fallbackMeasurer: invalid font.size '${font.size}'; must be a non-negative finite number`,
    );
  }

  return {
    width: text.length * font.size * 0.55,
    height: font.size * 1.2,
  };
};

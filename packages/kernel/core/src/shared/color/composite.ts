import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { parseStaticCssColor } from './parse';

/** 把归一化 sRGB 通道格式化为两位小写十六进制 */
const formatChannel = (channel: number): string =>
  Math.round(channel * 255)
    .toString(16)
    .padStart(2, '0');

/**
 * 把静态 CSS 前景色按权重预合成到不透明静态底色
 * @description 前景自身 alpha 与 weight 相乘，再按 source-over sRGB 得到不含透明度的确定性颜色
 */
export const compositeOpaqueColor = (foreground: string, backdrop: string, weight: number): `#${string}` => {
  if (!Number.isFinite(weight) || weight < 0 || weight > 1) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Color,
      'compositeOpaqueColor: weight must be a finite number in [0, 1].',
    );
  }
  const parsedForeground = parseStaticCssColor(foreground);
  if (parsedForeground === null) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Color,
      `compositeOpaqueColor: unsupported static foreground '${foreground}'.`,
    );
  }
  const parsedBackdrop = parseStaticCssColor(backdrop);
  if (parsedBackdrop === null) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Color,
      `compositeOpaqueColor: unsupported static backdrop '${backdrop}'.`,
    );
  }
  if (parsedBackdrop.a !== 1) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Color,
      `compositeOpaqueColor: backdrop '${backdrop}' must be opaque.`,
    );
  }
  const alpha = parsedForeground.a * weight;
  const red = parsedForeground.r * alpha + parsedBackdrop.r * (1 - alpha);
  const green = parsedForeground.g * alpha + parsedBackdrop.g * (1 - alpha);
  const blue = parsedForeground.b * alpha + parsedBackdrop.b * (1 - alpha);
  return `#${formatChannel(red)}${formatChannel(green)}${formatChannel(blue)}`;
};

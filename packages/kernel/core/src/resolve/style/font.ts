import { mergeProperties } from '@retikz/foundation';

import type { IRFont } from '../../schemas';

/** 按声明顺序合并字体字段，缺失字段保留祖先值 */
export const mergeFont = (...fonts: Array<IRFont | undefined>): IRFont | undefined =>
  fonts.every(font => font === undefined)
    ? undefined
    : mergeProperties(fonts, { shouldOverride: value => value !== undefined });

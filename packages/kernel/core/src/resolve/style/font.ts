import { mergeProperties } from '@retikz/foundation';

import type { IRFont } from '../../schemas';

/** 按参数顺序合并字体，后面的非 undefined 字段优先；全部省略时返回 undefined */
export const mergeFont = (...fonts: Array<IRFont | undefined>): IRFont | undefined =>
  fonts.every(font => font === undefined)
    ? undefined
    : mergeProperties(fonts, { shouldOverride: value => value !== undefined });

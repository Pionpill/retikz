import type { ValueOf } from '../../shared';

/** CSS font-weight 关键字 */
export const FontWeightKeyword = {
  /** 常规字重 */
  Normal: 'normal',
  /** 加粗字重 */
  Bold: 'bold',
} as const;

/** CSS font-style 关键字 */
export const FontStyle = {
  /** 常规字体样式 */
  Normal: 'normal',
  /** 斜体样式 */
  Italic: 'italic',
  /** 倾斜样式 */
  Oblique: 'oblique',
} as const;

/** Web 风格字号 preset。 */
export const WebFontSizePreset = {
  Xxs: '2xs',
  Xs: 'xs',
  Sm: 'sm',
  Base: 'base',
  Lg: 'lg',
  Xl: 'xl',
  Xl2: '2xl',
  Xl3: '3xl',
  Xl4: '4xl',
  Xl5: '5xl',
  Xl6: '6xl',
  Xl7: '7xl',
  Xl8: '8xl',
  Xl9: '9xl',
} as const;

/** Web 风格字号 preset 到 root font size 的比例。 */
export const WebFontSizeRatio = {
  [WebFontSizePreset.Xxs]: 0.625,
  [WebFontSizePreset.Xs]: 0.75,
  [WebFontSizePreset.Sm]: 0.875,
  [WebFontSizePreset.Base]: 1,
  [WebFontSizePreset.Lg]: 1.125,
  [WebFontSizePreset.Xl]: 1.25,
  [WebFontSizePreset.Xl2]: 1.5,
  [WebFontSizePreset.Xl3]: 1.875,
  [WebFontSizePreset.Xl4]: 2.25,
  [WebFontSizePreset.Xl5]: 3,
  [WebFontSizePreset.Xl6]: 3.75,
  [WebFontSizePreset.Xl7]: 4.5,
  [WebFontSizePreset.Xl8]: 6,
  [WebFontSizePreset.Xl9]: 8,
} as const satisfies Record<ValueOf<typeof WebFontSizePreset>, number>;

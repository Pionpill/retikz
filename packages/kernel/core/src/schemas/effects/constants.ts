import type { ValueOf } from '../../types';
import type { DropShadow } from './types';

/**
 * 阴影预设档位关键字（Tailwind 风格刻度）
 * @description 预设字符串 `shadow="md"` 等价于对象 `{ preset:'md' }`；`SHADOW_PRESETS` 表为档位展开单一真源。
 *   `none` = 显式无阴影（当前等价省略，为将来 scope 级联预留）。
 */
export const ShadowPreset = {
  None: 'none',
  Sm: 'sm',
  Md: 'md',
  Lg: 'lg',
  Xl: 'xl',
  Xxl: '2xl',
} as const;

/**
 * 预设档位 → canonical DropShadow 单一真源表
 * @description compile 用本表把预设字符串 / `{ preset }` 展开成解析后对象；`none` → null（不产阴影，等价省略）。
 *   单层近似 Tailwind 阴影刻度：`offsetX=0`、暗化半透明黑；exact 值实现期按快照微调。
 */
export const SHADOW_PRESETS: Record<ShadowPresetValue, DropShadow | null> = {
  none: null,
  sm: { offsetX: 0, offsetY: 1, blur: 2, color: 'rgba(0,0,0,0.10)' },
  md: { offsetX: 0, offsetY: 3, blur: 6, color: 'rgba(0,0,0,0.12)' },
  lg: { offsetX: 0, offsetY: 8, blur: 15, color: 'rgba(0,0,0,0.12)' },
  xl: { offsetX: 0, offsetY: 12, blur: 25, color: 'rgba(0,0,0,0.12)' },
  '2xl': { offsetX: 0, offsetY: 20, blur: 40, color: 'rgba(0,0,0,0.18)' },
};

/**
 * W3C 分离式混合模式集（16 个）
 * @description 三端共有交集（SVG `mix-blend-mode` / Canvas `globalCompositeOperation`）；混合数学按 W3C 规范两端逐式相同。
 *   `normal` 保留为显式值（= 省略，便于显式覆盖）。
 */
export const BlendMode = {
  Normal: 'normal',
  Multiply: 'multiply',
  Screen: 'screen',
  Overlay: 'overlay',
  Darken: 'darken',
  Lighten: 'lighten',
  ColorDodge: 'color-dodge',
  ColorBurn: 'color-burn',
  HardLight: 'hard-light',
  SoftLight: 'soft-light',
  Difference: 'difference',
  Exclusion: 'exclusion',
  Hue: 'hue',
  Saturation: 'saturation',
  Color: 'color',
  Luminosity: 'luminosity',
} as const;

/** 阴影预设档位值联合 */
export type ShadowPresetValue = ValueOf<typeof ShadowPreset>;

/** 混合模式值联合 */
export type BlendModeValue = ValueOf<typeof BlendMode>;

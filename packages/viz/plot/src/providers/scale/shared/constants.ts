/**
 * 内置命名配色方案名。
 * @description 这些名字只声明内置 color scheme resolver 的注册键；schema 只校验非空字符串，具体 scheme 是否存在由 lowering 的 color scheme resolver 解析
 */
export const PlotColorScheme = {
  /** sequential 单色相蓝 */
  Blues: 'blues',
  /** sequential 单色相绿 */
  Greens: 'greens',
  /** sequential 单色相灰 */
  Greys: 'greys',
  /** sequential 单色相橙 */
  Oranges: 'oranges',
  /** sequential 单色相紫 */
  Purples: 'purples',
  /** sequential 单色相红 */
  Reds: 'reds',
  /** sequential 多色相（感知均匀、色盲友好；sequential 默认） */
  Viridis: 'viridis',
  /** sequential 多色相 magma */
  Magma: 'magma',
  /** sequential 多色相 inferno */
  Inferno: 'inferno',
  /** sequential 多色相 plasma */
  Plasma: 'plasma',
  /** sequential 多色相 cividis（色盲友好） */
  Cividis: 'cividis',
  /** sequential 多色相 turbo */
  Turbo: 'turbo',
  /** diverging 棕—蓝绿 */
  BrBG: 'brbg',
  /** diverging 紫红—绿 */
  PRGn: 'prgn',
  /** diverging 粉红—黄绿 */
  PiYG: 'piyg',
  /** diverging 紫—橙 */
  PuOr: 'puor',
  /** diverging 红—蓝（diverging 默认） */
  RdBu: 'rdbu',
  /** diverging 红—灰 */
  RdGy: 'rdgy',
  /** diverging 红—黄—蓝 */
  RdYlBu: 'rdylbu',
  /** diverging 红—黄—绿 */
  RdYlGn: 'rdylgn',
  /** diverging 光谱（红—橙—黄—绿—蓝） */
  Spectral: 'spectral',
} as const;

/** 内置配色方案名集合；用于内置 resolver 与自定义 resolver 分流 */
export const BUILTIN_COLOR_SCHEMES: ReadonlySet<string> = new Set<string>(Object.values(PlotColorScheme));

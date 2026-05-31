/** Canvas renderer 暂不支持能力的降级类别 */
export type UnsupportedCanvasFeature = 'paint' | 'clip';

/** Canvas renderer 降级告警 */
export type CanvasWarning = {
  /** 降级类别 */
  feature: UnsupportedCanvasFeature;
  /** 面向开发者的诊断信息 */
  message: string;
};

/** Canvas Scene 绘制选项 */
export type DrawOptions = {
  /** 接收未支持能力的诊断告警；缺省写入 `console.warn` */
  warnUnsupported?: (warning: CanvasWarning) => void;
  /** 文本 primitive 未指定 fontFamily 时的默认 CSS font-family */
  defaultFontFamily?: string;
  /**
   * `currentColor` 解析目标
   * @description canvas 是即时模式、无法从 DOM 继承 CSS `color`；`renderToCanvas` 读 `getComputedStyle(canvas).color`
   *   写入此项，drawScene 把颜色串 `currentColor` 解析为它（缺省不解析、保持原串）。修复主题反应 / 暗色模式。
   */
  currentColor?: string;
  /**
   * image paint server 的图片获取器
   * @description canvas 同步绘制、无法 await 图片加载；调用方（如 React canvasHost）维护按 href 的图片缓存，
   *   返回已解码可绘制的 `CanvasImageSource`，未就绪返回 `null`（drawScene 本帧跳过、加载完由调用方触发重绘）。
   *   缺省（未提供）时 image 填充降级告警 paint。
   */
  getImage?: (href: string) => CanvasImageSource | null;
  /**
   * pattern paint server 的离屏 2D context 工厂
   * @description pattern 需把 motif tile 离屏渲染后 `createPattern`；canvas/OffscreenCanvas 创建依赖宿主环境，
   *   故由调用方（如 `renderToCanvas`）提供。返回 `size×size` 的 2D context（其 `.canvas` 作为 pattern 图源）；
   *   缺省（未提供）时 pattern 填充降级告警 paint。
   */
  createOffscreen?: (width: number, height: number) => CanvasRenderingContext2D | null;
  /**
   * 把任意 CSS 颜色串归一成 hex / rgb(a)（用于渐变 stop 烘焙 alpha）
   * @description canvas `addColorStop` 无 stop-opacity，stop 的 opacity 须烘焙进颜色串；而命名色（darkorange）
   *   / hsl 等无法直接正则解析。drawScene 跑在 spy ctx 上无法解析 CSS 色，故归一由宿主注入：`renderToCanvas`
   *   缺省用真实 canvas 的 `fillStyle` 往返（浏览器规范化为 `#rrggbb` / `rgba(...)`）。未提供时命名色 stop 的
   *   opacity 按 best-effort 忽略（渐变退化为纯色，与历史一致）。
   */
  resolveCssColor?: (color: string) => string;
};

/** HTMLCanvasElement 渲染选项 */
export type RenderOptions = DrawOptions & {
  /** 渲染前是否清空画布 */
  clear?: boolean;
  /** 设备像素比；缺省读取 `globalThis.devicePixelRatio`，再回退 1 */
  devicePixelRatio?: number;
};

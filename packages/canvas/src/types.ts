/** Canvas renderer 暂不支持能力的降级类别 */
export type UnsupportedCanvasFeature = 'paint' | 'clip' | 'marker';

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
};

/** HTMLCanvasElement 渲染选项 */
export type RenderOptions = DrawOptions & {
  /** 渲染前是否清空画布 */
  clear?: boolean;
  /** 设备像素比；缺省读取 `globalThis.devicePixelRatio`，再回退 1 */
  devicePixelRatio?: number;
};

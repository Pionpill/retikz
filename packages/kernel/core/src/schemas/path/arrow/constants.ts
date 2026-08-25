/**
 * 内置箭头形状常量（用 const 而非 TS enum 避免 reverse-mapping 和字面量不互通）
 * @description normal 实心三角；open 空心三角；stealth 尖锐倒钩；openStealth 空心尖锐倒钩；circle 实心圆点；openCircle 空心圆点
 */
export const BuiltinArrowShape = {
  Normal: 'normal',
  Open: 'open',
  Stealth: 'stealth',
  OpenStealth: 'openStealth',
  Circle: 'circle',
  OpenCircle: 'openCircle',
} as const;

/** 箭头默认形状 */
export const DEFAULT_ARROW_SHAPE = BuiltinArrowShape.Stealth;

/** 箭头默认尺寸（length / width 的 fallback） */
export const ARROW_MARKER_DEFAULT_SIZE = 8;

/** 空心 shape 描边默认粗细（lineWidth fallback） */
export const ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH = 1.5;

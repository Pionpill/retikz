import type { ValueOf } from '@retikz/foundation';

/** 内置箭头形状名称 */
export const BuiltinArrowShape = {
  Normal: 'normal',
  Open: 'open',
  Stealth: 'stealth',
  OpenStealth: 'openStealth',
  Circle: 'circle',
  OpenCircle: 'openCircle',
} as const;

export type BuiltinArrowShape = ValueOf<typeof BuiltinArrowShape>;

/** 箭头默认形状 */
export const DEFAULT_ARROW_SHAPE = BuiltinArrowShape.Stealth;

/** 箭头默认尺寸（length / width 的 fallback） */
export const ARROW_MARKER_DEFAULT_SIZE = 8;

/** 空心 shape 描边默认粗细（lineWidth fallback） */
export const ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH = 1.5;

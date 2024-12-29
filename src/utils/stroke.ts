import { StrokeProps } from '../types/svg/stroke';

export type StrokeType =
  | 'solid'
  | 'dashed'
  | 'denselyDashed'
  | 'looselyDashed'
  | 'dotted'
  | 'denselyDotted'
  | 'looselyDotted'
  | 'dashDot'
  | 'denselyDashDot'
  | 'looselyDashDot'
  | 'dashDashDot'
  | 'denselyDashDashDot'
  | 'looselyDashDashDot';

/** 将 StrokeType 转换为 svg 原生的属性 */
export const convertStrokeType = (strokeType: StrokeType, strokeWidth = 1): Partial<StrokeProps> => {
  switch (strokeType) {
    case 'solid':
      return {};
    case 'dashed':
      return { strokeDasharray: `${strokeWidth * 4} ${strokeWidth * 4}` };
    case 'denselyDashed':
      return { strokeDasharray: `${strokeWidth * 4} ${strokeWidth * 2}` };
    case 'looselyDashed':
      return { strokeDasharray: `${strokeWidth * 4} ${strokeWidth * 6}` };
    case 'dotted':
      return { strokeDasharray: `1 ${strokeWidth * 4}` };
    case 'denselyDotted':
      return { strokeDasharray: `1 ${strokeWidth * 2}` };
    case 'looselyDotted':
      return { strokeDasharray: `1 ${strokeWidth * 6}` };
    case 'dashDot':
      return { strokeDasharray: `${strokeWidth * 4} ${strokeWidth * 4} 1 ${strokeWidth * 4}` };
    case 'denselyDashDot':
      return { strokeDasharray: `${strokeWidth * 4} ${strokeWidth * 2} 1 ${strokeWidth * 2}` };
    case 'looselyDashDot':
      return { strokeDasharray: `${strokeWidth * 4} ${strokeWidth * 6} 1 ${strokeWidth * 6}` };
    case 'dashDashDot':
      return { strokeDasharray: `${strokeWidth * 4} ${strokeWidth * 4} 1 ${strokeWidth * 4} 1 ${strokeWidth * 4}` };
    case 'denselyDashDashDot':
      return { strokeDasharray: `${strokeWidth * 4} ${strokeWidth * 2} 1 ${strokeWidth * 2} 1 ${strokeWidth * 2}` };
    case 'looselyDashDashDot':
      return { strokeDasharray: `${strokeWidth * 4} ${strokeWidth * 6} 1 ${strokeWidth * 6} 1 ${strokeWidth * 6}` };
  }
};

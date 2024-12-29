import { StrokeProps } from '../types/svg/stroke';

export type StrokeType =
  | 'solid'
  | 'dashed'
  | 'denselyDashed'
  | 'looselyDashed'
  | 'dotted'
  | 'denselyDotted'
  | 'looselyDotted';

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
      return { strokeDasharray: `0 ${strokeWidth * 4}`, strokeLinecap: 'round' as StrokeProps['strokeLinecap'] };
    case 'denselyDotted':
      return { strokeDasharray: `0 ${strokeWidth * 2}`, strokeLinecap: 'round' as StrokeProps['strokeLinecap'] };
    case 'looselyDotted':
      return { strokeDasharray: `0 ${strokeWidth * 6}`, strokeLinecap: 'round' as StrokeProps['strokeLinecap'] };
  }
};

import { StrokeProps } from '../../types/svg/stroke';

export const strokeTypes = [
  'solid',
  'dashed',
  'denselyDashed',
  'looselyDashed',
  'dotted',
  'denselyDotted',
  'looselyDotted',
  'dashDot',
  'denselyDashDot',
  'looselyDashDot',
  'dashDashDot',
  'denselyDashDashDot',
  'looselyDashDashDot',
] as const;

export type StrokeType = typeof strokeTypes[number];

export type StrokeShortcutProps = {
  dashed?: boolean;
  denselyDashed?: boolean;
  looselyDashed?: boolean;
  dotted?: boolean;
  denselyDotted?: boolean;
  looselyDotted?: boolean;
  dashDot?: boolean;
  denselyDashDot?: boolean;
  looselyDashDot?: boolean;
  dashDashDot?: boolean;
  denselyDashDashDot?: boolean;
  looselyDashDashDot?: boolean;
};

/** 将 StrokeType 转换为 svg 原生的属性 */
export const convertStrokeType = (strokeType: StrokeType, oriStrokeWidth: string | number = 1): Partial<StrokeProps> => {
  const strokeWidth = Number(oriStrokeWidth);
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

export const convertStrokeShortcut = (shortcutProps: StrokeShortcutProps, oriStrokeWidth: string | number = 1): Partial<StrokeProps> => {
  const strokeWidth = Number(oriStrokeWidth);
  return convertStrokeType(
    shortcutProps.dashed
      ? 'dashed'
      : shortcutProps.denselyDashed
      ? 'denselyDashed'
      : shortcutProps.looselyDashed
      ? 'looselyDashed'
      : shortcutProps.dotted
      ? 'dotted'
      : shortcutProps.denselyDotted
      ? 'denselyDotted'
      : shortcutProps.looselyDotted
      ? 'looselyDotted'
      : shortcutProps.dashDot
      ? 'dashDot'
      : shortcutProps.denselyDashDot
      ? 'denselyDashDot'
      : shortcutProps.looselyDashDot
      ? 'looselyDashDot'
      : shortcutProps.dashDashDot
      ? 'dashDashDot'
      : shortcutProps.denselyDashDashDot
      ? 'denselyDashDashDot'
      : shortcutProps.looselyDashDashDot
      ? 'looselyDashDashDot'
      : 'solid',
    strokeWidth || 1,
  );
};

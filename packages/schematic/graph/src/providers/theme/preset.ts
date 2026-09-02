import type { ResolvedTheme } from '@retikz/core';

import { ThemeMode } from '@retikz/core';

import type { GraphThemeStyleResolution } from '../../contract';

/** 从当前 Core Theme 建立 Graph Entity 与 Relation 的中立完整 baseline */
export const getDefaultGraphThemePreset = (theme: ResolvedTheme): GraphThemeStyleResolution => {
  const foreground = theme.mode === ThemeMode.Light ? '#000000' : '#ffffff';
  return {
    entity: {
      tokens: {
        color: foreground,
        textColor: 'contrast',
        fill: 0.08,
        stroke: 1,
        strokeWidth: 1,
        fillOpacity: 1,
        strokeOpacity: 1,
        opacity: 1,
      },
    },
    relation: {
      tokens: {
        color: foreground,
        stroke: 'currentColor',
        strokeWidth: 1,
        strokeOpacity: 1,
        opacity: 1,
        labelTextForeground: 'gray',
        labelFont: { size: 'sm' },
        labelOpacity: 1,
      },
    },
    group: {
      tokens: {
        background: { fill: 'lightgray', fillOpacity: 0.04 },
        border: { stroke: 'lightgray', strokeWidth: 1, dashPattern: [4, 3] },
        cornerRadius: 4,
      },
    },
    block: {
      tokens: {
        background: { fill: 'none' },
        border: { stroke: 'currentColor', strokeWidth: 1, strokeOpacity: 0.2 },
        cornerRadius: 8,
      },
    },
  };
};

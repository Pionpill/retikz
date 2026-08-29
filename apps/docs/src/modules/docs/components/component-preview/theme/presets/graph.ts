import type { GraphThemeStyleOverrides } from '@retikz/graph';

import { ThemeMode } from '@retikz/core';
import { defineGraphThemeStyle } from '@retikz/graph';

import { PreviewThemeStyle } from '../constants';

type ReferenceStyle = Exclude<(typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle], 'default'>;

const modeForeground = (mode: (typeof ThemeMode)[keyof typeof ThemeMode]): '#000000' | '#ffffff' =>
  mode === ThemeMode.Light ? '#000000' : '#ffffff';

const graphThemeOverridesOf = (
  style: ReferenceStyle,
  theme: Parameters<Parameters<typeof defineGraphThemeStyle>[0]['resolve']>[0],
): GraphThemeStyleOverrides => {
  const foreground = modeForeground(theme.mode);
  const color = theme.colors.categorical[0];
  if (style === PreviewThemeStyle.Academic) {
    return {
      entity: {
        tokens: {
          color,
          textColor: 'contrast',
          fill: 0.15,
          stroke: 'currentColor',
          strokeWidth: 1,
        },
      },
      relation: { tokens: { color: foreground, strokeWidth: 1.25 } },
    };
  }
  if (style === PreviewThemeStyle.Vibrant) {
    return {
      entity: {
        tokens: {
          color,
          textColor: 'contrast',
          fill: color,
          stroke: 'none',
        },
      },
      relation: { tokens: { color: theme.colors.categorical[1], strokeWidth: 1.5 } },
    };
  }

  return {
    entity: {
      tokens: {
        color,
        textColor: 'contrast',
        fill: 0.15,
        stroke: 'none',
      },
    },
    relation: { tokens: { color: foreground, strokeWidth: 1, opacity: 0.72 } },
  };
};

/** docs 维护的三个 Graph reference Theme definitions */
export const PreviewGraphThemeStyles = [
  PreviewThemeStyle.Academic,
  PreviewThemeStyle.Vibrant,
  PreviewThemeStyle.Clean,
].map(style => defineGraphThemeStyle({ name: style, resolve: theme => graphThemeOverridesOf(style, theme) }));

import type { GraphThemeStyleSource } from '@retikz/graph';

import { ThemeMode } from '@retikz/core';
import { defineGraphThemeStyle } from '@retikz/graph';

import { PreviewThemeStyle } from '../constants';

type ReferenceStyle = Exclude<(typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle], 'default'>;

const modeForeground = (mode: (typeof ThemeMode)[keyof typeof ThemeMode]): '#000000' | '#ffffff' =>
  mode === ThemeMode.Light ? '#000000' : '#ffffff';

const graphThemeSourceOf = (
  style: ReferenceStyle,
  theme: Parameters<Parameters<typeof defineGraphThemeStyle>[0]['resolve']>[0],
): GraphThemeStyleSource => {
  if (style === PreviewThemeStyle.Clean) {
    return { defaults: { entity: { style: { textColor: modeForeground(theme.mode), fill: 'none' } } } };
  }

  const foreground = modeForeground(theme.mode);
  const color = theme.colors.categorical[0];
  if (style === PreviewThemeStyle.Academic) {
    return {
      defaults: {
        entity: {
          style: {
            color,
            textColor: 'contrast',
            fill: 0.15,
            stroke: 'currentColor',
            strokeWidth: 1,
          },
        },
        relation: { style: { color: foreground, strokeWidth: 1.25 } },
        group: {
          background: { fill: 'none' },
          border: { stroke: foreground, strokeWidth: 1, dashPattern: [4, 3] },
          cornerRadius: 0,
        },
        block: {
          background: { fill: 'none' },
          border: { stroke: foreground, strokeWidth: 1 },
          cornerRadius: 0,
        },
      },
    };
  }
  return {
    defaults: {
      entity: {
        style: {
          color,
          textColor: 'contrast',
          fill: 1,
          stroke: 'none',
        },
      },
      relation: { style: { color: theme.colors.categorical[1], strokeWidth: 1.5 } },
      group: {
        background: { fill: color, fillOpacity: 0.08 },
        border: { stroke: color, strokeWidth: 1.5, strokeOpacity: 0.7 },
        cornerRadius: 12,
      },
      block: {
        background: { fill: theme.colors.categorical[1], fillOpacity: 0.12 },
        border: { stroke: theme.colors.categorical[1], strokeWidth: 1.5, strokeOpacity: 0.85 },
        cornerRadius: 12,
      },
    },
  };
};

/** docs 维护的三个 Graph reference Theme definitions */
export const PreviewGraphThemeStyles = [
  PreviewThemeStyle.Academic,
  PreviewThemeStyle.Vibrant,
  PreviewThemeStyle.Clean,
].map(style => defineGraphThemeStyle({ name: style, resolve: theme => graphThemeSourceOf(style, theme) }));

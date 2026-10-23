import type { ResolvedTheme } from '@retikz/core';
import type { IRTableDefaults } from '@retikz/table';
import { defineTableTheme, TableDefaultsSchema } from '@retikz/table';

import { logicFigureTableTheme } from '../../../logic-figure';
import { PreviewTheme } from '../constants';

type ReferenceStyle = Exclude<(typeof PreviewTheme)[keyof typeof PreviewTheme], 'default'>;

const line = (stroke: string, width: number) => ({ kind: 'line' as const, stroke, width });

const styles = {
  academic: {
    light: {
      defaultAppearance: {
        body: {
          content: {
            defaults: {
              style: { color: '#111111' },
              node: {
                style: { font: { family: 'serif', weight: 400 } },
                label: { font: { family: 'serif', weight: 400 } },
              },
              path: { label: { font: { family: 'serif', weight: 400 } } },
            },
          },
        },
        columnHeader: {
          content: {
            defaults: {
              style: { color: '#111111' },
              node: {
                style: { font: { family: 'serif', weight: 600 } },
                label: { font: { family: 'serif', weight: 600 } },
              },
              path: { label: { font: { family: 'serif', weight: 600 } } },
            },
          },
          borders: { bottom: line('#111111', 0.8) },
        },
      },
      layout: { borders: { outer: { top: line('#111111', 1.2), bottom: line('#111111', 1.2) } } },
      defaultVisual: { sequential: ['#f7fbff', '#08306b'] },
    },
    dark: {
      defaultAppearance: {
        body: {
          background: { fill: '#111111' },
          content: {
            defaults: {
              style: { color: '#f5f5f5' },
              node: {
                style: { font: { family: 'serif', weight: 400 } },
                label: { font: { family: 'serif', weight: 400 } },
              },
              path: { label: { font: { family: 'serif', weight: 400 } } },
            },
          },
        },
        columnHeader: {
          background: { fill: '#111111' },
          content: {
            defaults: {
              style: { color: '#f5f5f5' },
              node: {
                style: { font: { family: 'serif', weight: 600 } },
                label: { font: { family: 'serif', weight: 600 } },
              },
              path: { label: { font: { family: 'serif', weight: 600 } } },
            },
          },
          borders: { bottom: line('#a3a3a3', 0.8) },
        },
      },
      layout: { borders: { outer: { top: line('#f5f5f5', 1.2), bottom: line('#f5f5f5', 1.2) } } },
      defaultVisual: { sequential: ['#1e3a5f', '#90caf9'] },
    },
  },
  vibrant: {
    light: {
      defaultAppearance: {
        body: {
          background: { fill: '#e5ecf6' },
          content: { defaults: { style: { color: '#2a3f5f' } } },
        },
        columnHeader: {
          background: { fill: '#d7e3f4' },
          content: { defaults: { style: { color: '#2a3f5f' }, node: { style: { font: { weight: 600 } } } } },
          borders: { bottom: line('#ffffff', 1) },
        },
      },
      layout: {
        borders: {
          horizontal: line('#ffffff', 1),
          vertical: line('#ffffff', 1),
        },
      },
      defaultVisual: { sequential: ['#dbeafe', '#2563eb'] },
    },
    dark: {
      defaultAppearance: {
        body: {
          background: { fill: '#111827' },
          content: { defaults: { style: { color: '#f0f6fc' } } },
        },
        columnHeader: {
          background: { fill: '#1f2937' },
          content: { defaults: { style: { color: '#f0f6fc' }, node: { style: { font: { weight: 600 } } } } },
          borders: { bottom: line('#475569', 1) },
        },
      },
      layout: {
        borders: {
          horizontal: line('#374151', 1),
          vertical: line('#374151', 1),
        },
      },
    },
  },
  clean: {
    light: {
      defaultAppearance: {
        body: { background: { fill: 'none' }, content: { defaults: { style: { color: 'currentColor' } } } },
        columnHeader: { background: { fill: 'none' }, content: { defaults: { style: { color: 'currentColor' } } } },
      },
      layout: { borders: { horizontal: { kind: 'none' } } },
    },
    dark: {
      defaultAppearance: {
        body: { background: { fill: 'none' }, content: { defaults: { style: { color: 'currentColor' } } } },
        columnHeader: { background: { fill: 'none' }, content: { defaults: { style: { color: 'currentColor' } } } },
      },
      layout: { borders: { horizontal: { kind: 'none' } } },
    },
  },
} as const satisfies Record<ReferenceStyle, Record<ResolvedTheme['mode'], IRTableDefaults>>;

const defaultsOf = (style: ReferenceStyle, theme: ResolvedTheme): IRTableDefaults =>
  TableDefaultsSchema.parse(structuredClone(styles[style][theme.mode]));

/** docs 维护的三个 Table reference Theme definitions */
export const PreviewTableThemeDefinitions = [
  ...[PreviewTheme.Academic, PreviewTheme.Vibrant, PreviewTheme.Clean].map(style =>
    defineTableTheme({ name: style, resolve: theme => ({ defaults: defaultsOf(style, theme) }) }),
  ),
  logicFigureTableTheme,
];

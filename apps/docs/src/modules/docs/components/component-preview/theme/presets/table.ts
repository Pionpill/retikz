import type { ResolvedTheme } from '@retikz/core';
import type { IRTableDefaults } from '@retikz/table';

import { defineTableThemeStyle, TableDefaultsSchema } from '@retikz/table';

import { PreviewThemeStyle } from '../constants';

type ReferenceStyle = Exclude<(typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle], 'default'>;

const line = (stroke: string, width: number) => ({ kind: 'line' as const, stroke, width });

const styles = {
  academic: {
    light: {
      appearanceDefaults: {
        body: {
          content: {
            style: { color: '#111111' },
            defaults: {
              node: { style: { font: { family: 'serif', weight: 400 } } },
              label: { font: { family: 'serif', weight: 400 } },
            },
          },
        },
        columnHeader: {
          content: {
            style: { color: '#111111' },
            defaults: {
              node: { style: { font: { family: 'serif', weight: 600 } } },
              label: { font: { family: 'serif', weight: 600 } },
            },
          },
          borders: { bottom: line('#111111', 0.8) },
        },
      },
      layout: { borders: { outer: { top: line('#111111', 1.2), bottom: line('#111111', 1.2) } } },
      visualDefaults: { sequential: ['#f7fbff', '#08306b'] },
    },
    dark: {
      appearanceDefaults: {
        body: {
          background: { fill: '#111111' },
          content: {
            style: { color: '#f5f5f5' },
            defaults: {
              node: { style: { font: { family: 'serif', weight: 400 } } },
              label: { font: { family: 'serif', weight: 400 } },
            },
          },
        },
        columnHeader: {
          background: { fill: '#111111' },
          content: {
            style: { color: '#f5f5f5' },
            defaults: {
              node: { style: { font: { family: 'serif', weight: 600 } } },
              label: { font: { family: 'serif', weight: 600 } },
            },
          },
          borders: { bottom: line('#a3a3a3', 0.8) },
        },
      },
      layout: { borders: { outer: { top: line('#f5f5f5', 1.2), bottom: line('#f5f5f5', 1.2) } } },
      visualDefaults: { sequential: ['#1e3a5f', '#90caf9'] },
    },
  },
  vibrant: {
    light: {
      appearanceDefaults: {
        body: {
          background: { fill: '#e5ecf6' },
          content: { style: { color: '#2a3f5f' } },
        },
        columnHeader: {
          background: { fill: '#d7e3f4' },
          content: { style: { color: '#2a3f5f' }, defaults: { node: { style: { font: { weight: 600 } } } } },
          borders: { bottom: line('#ffffff', 1) },
        },
      },
      layout: {
        borders: {
          horizontal: line('#ffffff', 1),
          vertical: line('#ffffff', 1),
        },
      },
      visualDefaults: { sequential: ['#dbeafe', '#2563eb'] },
    },
    dark: {
      appearanceDefaults: {
        body: {
          background: { fill: '#111827' },
          content: { style: { color: '#f0f6fc' } },
        },
        columnHeader: {
          background: { fill: '#1f2937' },
          content: { style: { color: '#f0f6fc' }, defaults: { node: { style: { font: { weight: 600 } } } } },
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
      appearanceDefaults: {
        body: { background: { fill: 'none' }, content: { style: { color: 'currentColor' } } },
        columnHeader: { background: { fill: 'none' }, content: { style: { color: 'currentColor' } } },
      },
      layout: { borders: { horizontal: { kind: 'none' } } },
    },
    dark: {
      appearanceDefaults: {
        body: { background: { fill: 'none' }, content: { style: { color: 'currentColor' } } },
        columnHeader: { background: { fill: 'none' }, content: { style: { color: 'currentColor' } } },
      },
      layout: { borders: { horizontal: { kind: 'none' } } },
    },
  },
} as const satisfies Record<ReferenceStyle, Record<ResolvedTheme['mode'], IRTableDefaults>>;

const defaultsOf = (style: ReferenceStyle, theme: ResolvedTheme): IRTableDefaults =>
  TableDefaultsSchema.parse(structuredClone(styles[style][theme.mode]));

/** docs 维护的三个 Table reference Theme definitions */
export const PreviewTableThemeStyles = [
  PreviewThemeStyle.Academic,
  PreviewThemeStyle.Vibrant,
  PreviewThemeStyle.Clean,
].map(style => defineTableThemeStyle({ name: style, resolve: theme => ({ defaults: defaultsOf(style, theme) }) }));

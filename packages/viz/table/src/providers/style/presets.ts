import type { ThemeModeValue } from '@retikz/core';

import type { IRTableDefaults } from '../../schemas';

import { TableDefaultsSchema } from '../../schemas';
import { deepFreeze } from '../../shared';

const line = (stroke: string, width: number) => ({ kind: 'line' as const, stroke, width });

const presets: Readonly<Record<ThemeModeValue, IRTableDefaults>> = deepFreeze({
  light: TableDefaultsSchema.parse({
    appearanceDefaults: {
      body: {
        background: { fill: '#ffffff', fillOpacity: 1 },
        content: {
          style: { color: '#18181b' },
          defaults: {
            node: { style: { font: { family: 'sans-serif', weight: 400 } } },
            label: { font: { family: 'sans-serif', weight: 400 } },
          },
        },
      },
      columnHeader: {
        background: { fill: '#ffffff', fillOpacity: 1 },
        content: {
          style: { color: '#71717a' },
          defaults: {
            node: { style: { font: { family: 'sans-serif', weight: 500 } } },
            label: { font: { family: 'sans-serif', weight: 500 } },
          },
        },
        borders: { bottom: line('#e4e4e7', 1) },
      },
    },
    layout: { borders: { horizontal: line('#e4e4e7', 1) } },
    visualDefaults: { sequential: ['#eff6ff', '#1d4ed8'] },
  }),
  dark: TableDefaultsSchema.parse({
    appearanceDefaults: {
      body: {
        background: { fill: '#09090b', fillOpacity: 1 },
        content: {
          style: { color: '#fafafa' },
          defaults: {
            node: { style: { font: { family: 'sans-serif', weight: 400 } } },
            label: { font: { family: 'sans-serif', weight: 400 } },
          },
        },
      },
      columnHeader: {
        background: { fill: '#09090b', fillOpacity: 1 },
        content: {
          style: { color: '#a1a1aa' },
          defaults: {
            node: { style: { font: { family: 'sans-serif', weight: 500 } } },
            label: { font: { family: 'sans-serif', weight: 500 } },
          },
        },
        borders: { bottom: line('#27272a', 1) },
      },
    },
    layout: { borders: { horizontal: line('#27272a', 1) } },
    visualDefaults: { sequential: ['#172554', '#60a5fa'] },
  }),
});

/** 读取默认 Table style/mode 的 detached Source defaults */
export const getDefaultTableDefaults = (mode: ThemeModeValue): IRTableDefaults => structuredClone(presets[mode]);

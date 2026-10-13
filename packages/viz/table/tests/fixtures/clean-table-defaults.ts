import type { IRTableDefaults } from '../../src';

/** 与旧 Clean 外观等价、用于布局测试的 Source defaults fixture */
export const CLEAN_TABLE_DEFAULTS = {
  defaultAppearance: {
    body: {
      background: { fill: 'none' },
      content: { defaults: { style: { color: 'currentColor' } } },
    },
    columnHeader: {
      background: { fill: 'none' },
      content: { defaults: { style: { color: 'currentColor' } } },
      borders: { bottom: { kind: 'none' } },
    },
  },
  layout: { borders: { horizontal: { kind: 'none' } } },
} as const satisfies IRTableDefaults;

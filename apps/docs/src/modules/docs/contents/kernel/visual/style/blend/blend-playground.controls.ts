import { BlendMode } from '@retikz/core';

import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

/** 混合 playground 的稳定字段 id */
export const BlendPlaygroundControlId = {
  Mode: 'mode',
  Background: 'background',
  SourceA: 'sourceA',
  SourceB: 'sourceB',
  Opacity: 'opacity',
} as const;

const blendModeLabels = {
  normal: '普通合成',
  multiply: '正片叠底',
  screen: '滤色',
  overlay: '叠加',
  darken: '变暗',
  lighten: '变亮',
  'color-dodge': '颜色减淡',
  'color-burn': '颜色加深',
  'hard-light': '强光',
  'soft-light': '柔光',
  difference: '差值',
  exclusion: '排除',
  hue: '色相',
  saturation: '饱和度',
  color: '颜色',
  luminosity: '明度',
};

const blendModeOptions = Object.values(BlendMode).map(value => ({ value, label: blendModeLabels[value] }));

/** 混合模式的中文属性面板 */
export const blendPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '探索混合模式',
  sections: [
    {
      label: '合成',
      controls: [
        {
          kind: 'select',
          id: BlendPlaygroundControlId.Mode,
          label: '混合模式',
          defaultValue: BlendMode.Screen,
          options: blendModeOptions,
        },
      ],
    },
    {
      label: '颜色',
      controls: [
        { kind: 'color', id: BlendPlaygroundControlId.Background, label: '背景', defaultValue: '#0f172a' },
        { kind: 'color', id: BlendPlaygroundControlId.SourceA, label: '底层圆', defaultValue: '#f97316' },
        { kind: 'color', id: BlendPlaygroundControlId.SourceB, label: '上层圆', defaultValue: '#06b6d4' },
      ],
    },
    {
      label: '透明度',
      controls: [
        {
          kind: 'range',
          id: BlendPlaygroundControlId.Opacity,
          label: '上层透明度',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: blendPlaygroundControls,
  canonicalValues: {
    mode: BlendMode.Screen,
    background: '#0f172a',
    sourceA: '#f97316',
    sourceB: '#06b6d4',
    opacity: 1,
  },
  presets: [
    {
      id: 'screen',
      label: '深底提亮',
      values: {
        mode: BlendMode.Screen,
        background: '#0f172a',
        sourceA: '#f97316',
        sourceB: '#06b6d4',
        opacity: 1,
      },
    },
    {
      id: 'multiply',
      label: '浅底压暗',
      values: {
        mode: BlendMode.Multiply,
        background: '#f8fafc',
        sourceA: '#22c55e',
        sourceB: '#3b82f6',
        opacity: 1,
      },
    },
  ],
  relatedApis: ['Node.style.blendMode', 'Path.style.blendMode'],
} satisfies PreviewControlContract;

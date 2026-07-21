import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 自定义图案 playground 的稳定字段 id */
export const CustomPatternSizeControlId = {
  Size: 'size',
  Rotation: 'rotation',
  Color: 'color',
  Background: 'background',
} as const;

/** 自定义图案参数的中文属性面板 */
export const customPatternSizeControls = definePreviewControls({
  presentation: 'panel',
  title: '调整图案实例',
  sections: [
    {
      label: '重复单元',
      controls: [
        {
          kind: 'range',
          id: CustomPatternSizeControlId.Size,
          label: 'size',
          defaultValue: 16,
          min: 4,
          max: 24,
        },
        {
          kind: 'range',
          id: CustomPatternSizeControlId.Rotation,
          label: 'rotation',
          defaultValue: 0,
          min: -180,
          max: 180,
          step: 15,
        },
      ],
    },
    {
      label: '颜色',
      controls: [
        { kind: 'color', id: CustomPatternSizeControlId.Color, label: 'color', defaultValue: '#008000' },
        {
          kind: 'select',
          id: CustomPatternSizeControlId.Background,
          label: 'background',
          defaultValue: 'transparent',
          options: [
            { value: 'transparent', label: '透明' },
            { value: '#fef3c7', label: '浅色' },
            { value: '#0f172a', label: '深色' },
          ],
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: customPatternSizeControls,
  canonicalValues: { size: 16, rotation: 0, color: '#008000', background: 'transparent' },
  presets: [
    {
      id: 'dense',
      label: '密集',
      values: { size: 6, rotation: 0, color: '#008000', background: 'transparent' },
    },
    {
      id: 'rotated',
      label: '旋转',
      values: { size: 12, rotation: 45, color: '#ea580c', background: '#fef3c7' },
    },
  ],
  relatedApis: ['IRPaintSpec', 'PatternDefinition', 'Layout.patterns'],
} satisfies PreviewControlContract;

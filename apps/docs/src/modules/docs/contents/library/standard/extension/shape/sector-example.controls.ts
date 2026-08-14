import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Sector 示例使用的稳定字段 id */
export const SectorExampleControlId = {
  InnerRadius: 'innerRadius',
  OuterRadius: 'outerRadius',
  StartAngle: 'startAngle',
  EndAngle: 'endAngle',
  CornerRadius: 'cornerRadius',
} as const;

/** Sector 示例的中文属性面板 */
export const sectorExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Sector',
  sections: [
    {
      label: '环楔几何',
      controls: [
        {
          kind: 'range',
          id: SectorExampleControlId.InnerRadius,
          label: '内半径',
          defaultValue: 24,
          min: 0,
          max: 48,
          step: 2,
        },
        {
          kind: 'range',
          id: SectorExampleControlId.OuterRadius,
          label: '外半径',
          defaultValue: 68,
          min: 50,
          max: 84,
          step: 2,
        },
        {
          kind: 'range',
          id: SectorExampleControlId.StartAngle,
          label: '起始角',
          defaultValue: 25,
          min: 0,
          max: 300,
          step: 5,
        },
        {
          kind: 'range',
          id: SectorExampleControlId.EndAngle,
          label: '结束角',
          defaultValue: 325,
          min: 60,
          max: 360,
          step: 5,
        },
        {
          kind: 'range',
          id: SectorExampleControlId.CornerRadius,
          label: '圆角',
          defaultValue: 4,
          min: 0,
          max: 16,
          step: 1,
        },
      ],
    },
  ],
});

/** Sector 示例的稳定文档契约 */
export const previewControlContract = {
  controls: sectorExampleControls,
  canonicalValues: { innerRadius: 24, outerRadius: 68, startAngle: 25, endAngle: 325, cornerRadius: 4 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;

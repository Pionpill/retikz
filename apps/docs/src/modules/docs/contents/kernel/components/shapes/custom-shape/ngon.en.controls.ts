import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { NgonControlId } from './ngon.controls';

/** 参数化 ngon 的英文属性面板 */
export const ngonControls = definePreviewControls({
  presentation: 'panel',
  title: 'ngon Parameters',
  sections: [
    {
      label: 'Persisted parameter',
      controls: [
        {
          kind: 'range',
          id: NgonControlId.Sides,
          label: 'sides',
          defaultValue: 6,
          min: 3,
          max: 12,
          step: 1,
        },
      ],
    },
    {
      label: 'Node appearance',
      controls: [
        {
          kind: 'range',
          id: NgonControlId.Scale,
          label: 'scale',
          defaultValue: 1,
          min: 0.75,
          max: 2,
          step: 0.05,
        },
        {
          kind: 'color',
          id: NgonControlId.Fill,
          label: 'Fill',
          defaultValue: '#e0f2fe',
        },
        {
          kind: 'color',
          id: NgonControlId.Stroke,
          label: 'Stroke',
          defaultValue: '#0284c7',
        },
        {
          kind: 'range',
          id: NgonControlId.StrokeWidth,
          label: 'Stroke width',
          defaultValue: 2,
          min: 0,
          max: 8,
          step: 0.5,
        },
      ],
    },
  ],
});

/** ngon playground 的英文稳定状态与 API 覆盖 */
export const previewControlContract = {
  controls: ngonControls,
  canonicalValues: { sides: 6, scale: 1, fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 2 },
  presets: [
    { id: 'triangle', label: 'Triangle', values: { sides: 3, scale: 1 } },
    { id: 'scaled-octagon', label: 'Scaled octagon', values: { sides: 8, scale: 1.6 } },
  ],
  relatedApis: [
    'ShapeDefinition.paramsSchema',
    'ShapeDefinition.scaleParams',
    'Node.shape.params',
    'Node.scale',
    'Node.fill',
    'Node.stroke',
    'Node.strokeWidth',
  ],
} satisfies PreviewControlContract;

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** FlexLayout 关键分配行为的英文属性面板 */
export const flexLayoutPlaygroundEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'FlexLayout parameters',
  sections: [
    {
      label: 'Inspection overlay',
      controls: [
        {
          kind: 'switch',
          id: 'inspect',
          label: 'Show layout guides',
          defaultValue: true,
        },
      ],
    },
    {
      label: 'Direction and wrapping',
      controls: [
        {
          kind: 'select',
          id: 'direction',
          label: 'Main direction',
          defaultValue: 'row',
          options: [
            { value: 'row', label: 'Row' },
            { value: 'row-reverse', label: 'Row reverse' },
            { value: 'column', label: 'Column' },
            { value: 'column-reverse', label: 'Column reverse' },
          ],
        },
        {
          kind: 'select',
          id: 'wrap',
          label: 'Wrapping',
          defaultValue: 'wrap',
          options: [
            { value: 'nowrap', label: 'No wrap' },
            { value: 'wrap', label: 'Wrap' },
            { value: 'wrap-reverse', label: 'Wrap reverse' },
          ],
        },
      ],
    },
    {
      label: 'Alignment and distribution',
      controls: [
        {
          kind: 'select',
          id: 'alignItems',
          label: 'Cross alignment',
          defaultValue: 'center',
          options: [
            { value: 'start', label: 'Start' },
            { value: 'center', label: 'Center' },
            { value: 'end', label: 'End' },
            { value: 'stretch', label: 'Stretch' },
          ],
        },
        { kind: 'range', id: 'basis', label: 'Base size', defaultValue: 92, min: 52, max: 150, step: 2 },
        { kind: 'range', id: 'grow', label: 'A grow', defaultValue: 1, min: 0, max: 4, step: 1 },
        { kind: 'range', id: 'shrink', label: 'B shrink', defaultValue: 1, min: 0, max: 4, step: 1 },
      ],
    },
  ],
});

/** 当前 FlexLayout playground 的稳定英文文档契约 */
export const previewControlContract = {
  controls: flexLayoutPlaygroundEnControls,
  canonicalValues: {
    inspect: true,
    direction: 'row',
    wrap: 'wrap',
    alignItems: 'center',
    basis: 92,
    grow: 1,
    shrink: 1,
  },
  relatedApis: [
    'FlexLayout.inspect',
    'FlexLayout.direction',
    'FlexLayout.wrap',
    'FlexLayout.alignItems',
    'LayoutItem.basis',
    'LayoutItem.grow',
    'LayoutItem.shrink',
  ],
} satisfies PreviewControlContract;

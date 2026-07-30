import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** GridLayout 轨道分配的英文属性面板 */
export const gridLayoutPlaygroundEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'GridLayout parameters',
  sections: [
    {
      label: 'Tracks and auto placement',
      controls: [
        {
          kind: 'select',
          id: 'autoFlow',
          label: 'Auto-flow direction',
          defaultValue: 'row',
          options: [
            { value: 'row', label: 'Row' },
            { value: 'column', label: 'Column' },
          ],
        },
        { kind: 'range', id: 'fraction', label: 'Second-column share', defaultValue: 2, min: 1, max: 4, step: 1 },
        { kind: 'range', id: 'columnGap', label: 'Column gap', defaultValue: 8, min: 0, max: 24, step: 2 },
        { kind: 'range', id: 'rowGap', label: 'Row gap', defaultValue: 8, min: 0, max: 24, step: 2 },
      ],
    },
    {
      label: 'Cell alignment',
      controls: [
        {
          kind: 'select',
          id: 'justifyItems',
          label: 'Horizontal alignment',
          defaultValue: 'stretch',
          options: [
            { value: 'start', label: 'Start' },
            { value: 'center', label: 'Center' },
            { value: 'end', label: 'End' },
            { value: 'stretch', label: 'Stretch' },
          ],
        },
        {
          kind: 'select',
          id: 'alignItems',
          label: 'Vertical alignment',
          defaultValue: 'center',
          options: [
            { value: 'start', label: 'Start' },
            { value: 'center', label: 'Center' },
            { value: 'end', label: 'End' },
            { value: 'stretch', label: 'Stretch' },
          ],
        },
      ],
    },
  ],
});

/** 当前 GridLayout playground 的稳定英文文档契约 */
export const previewControlContract = {
  controls: gridLayoutPlaygroundEnControls,
  canonicalValues: {
    autoFlow: 'row',
    fraction: 2,
    columnGap: 8,
    rowGap: 8,
    justifyItems: 'stretch',
    alignItems: 'center',
  },
  relatedApis: [
    'GridLayout.autoFlow',
    'GridLayout.columns',
    'GridLayout.columnGap',
    'GridLayout.rowGap',
    'GridLayout.justifyItems',
    'GridLayout.alignItems',
  ],
} satisfies PreviewControlContract;

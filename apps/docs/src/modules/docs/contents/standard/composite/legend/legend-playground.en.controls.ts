import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 英文版 Legend 排列、间距与边界行为属性面板 */
export const legendPlaygroundEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Legend parameters',
  sections: [
    {
      label: 'Content',
      controls: [
        { kind: 'text', id: 'title', label: 'Title', defaultValue: 'A–D', multiline: true },
        {
          kind: 'select',
          id: 'kind',
          label: 'Legend kind',
          defaultValue: 'items',
          options: [
            { value: 'items', label: 'Discrete items' },
            { value: 'ramp', label: 'Continuous ramp' },
          ],
        },
      ],
    },
    {
      label: 'Title style',
      controls: [
        { kind: 'range', id: 'titleFontSize', label: 'Font size', defaultValue: 16, min: 12, max: 24, step: 1 },
        {
          kind: 'select',
          id: 'titleFontWeight',
          label: 'Font weight',
          defaultValue: 'bold',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'bold', label: 'Bold' },
          ],
        },
        {
          kind: 'select',
          id: 'titleFontStyle',
          label: 'Font style',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'italic', label: 'Italic' },
          ],
        },
        {
          kind: 'select',
          id: 'titleAlign',
          label: 'Multiline title alignment',
          defaultValue: 'start',
          options: [
            { value: 'start', label: 'Start' },
            { value: 'middle', label: 'Center' },
            { value: 'end', label: 'End' },
          ],
        },
      ],
    },
    {
      label: 'Arrangement',
      controls: [
        {
          kind: 'select',
          id: 'contentAlign',
          label: 'Content block alignment',
          defaultValue: 'start',
          options: [
            { value: 'start', label: 'Start' },
            { value: 'center', label: 'Center' },
            { value: 'end', label: 'End' },
          ],
        },
        {
          kind: 'select',
          id: 'direction',
          label: 'Main direction',
          defaultValue: 'horizontal',
          options: [
            { value: 'vertical', label: 'Vertical' },
            { value: 'horizontal', label: 'Horizontal' },
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
          ],
          visibleWhen: { controlId: 'kind', oneOf: ['items'] },
        },
        {
          kind: 'select',
          id: 'sampleAlign',
          label: 'Sample alignment',
          defaultValue: 'center',
          options: [
            { value: 'start', label: 'Top' },
            { value: 'center', label: 'Center' },
            { value: 'end', label: 'Bottom' },
          ],
          visibleWhen: { controlId: 'kind', oneOf: ['items'] },
        },
      ],
    },
    {
      label: 'Spacing',
      controls: [
        { kind: 'range', id: 'titleGap', label: 'Title to content', defaultValue: 8, min: 0, max: 24, step: 2 },
        {
          kind: 'range',
          id: 'columnGap',
          label: 'Column gap',
          defaultValue: 12,
          min: 0,
          max: 28,
          step: 2,
          visibleWhen: { controlId: 'kind', oneOf: ['items'] },
        },
        {
          kind: 'range',
          id: 'rowGap',
          label: 'Row gap',
          defaultValue: 10,
          min: 0,
          max: 24,
          step: 2,
          visibleWhen: { controlId: 'kind', oneOf: ['items'] },
        },
        { kind: 'range', id: 'sampleGap', label: 'Sample to label', defaultValue: 8, min: 0, max: 24, step: 2 },
        { kind: 'range', id: 'padding', label: 'Container padding', defaultValue: 12, min: 0, max: 24, step: 2 },
      ],
    },
    {
      label: 'Bounds',
      controls: [
        {
          kind: 'select',
          id: 'overflow',
          label: 'Visual overflow',
          defaultValue: 'visible',
          options: [
            { value: 'visible', label: 'Visible' },
            { value: 'clip', label: 'Clip' },
          ],
        },
      ],
    },
  ],
});

const canonicalValues = {
  title: 'A–D',
  kind: 'items',
  titleFontSize: 16,
  titleFontWeight: 'bold',
  titleFontStyle: 'normal',
  titleAlign: 'start',
  titleGap: 8,
  contentAlign: 'start',
  direction: 'horizontal',
  wrap: 'wrap',
  sampleAlign: 'center',
  columnGap: 12,
  rowGap: 10,
  sampleGap: 8,
  padding: 12,
  overflow: 'visible',
} as const;

/** 当前 Legend playground 的稳定英文文档契约 */
export const previewControlContract = {
  controls: legendPlaygroundEnControls,
  canonicalValues,
  relatedApis: [
    'Legend.kind',
    'LegendTitle.children',
    'LegendItem.sample',
    'LegendItem.children',
    'LegendRamp.children',
    'LegendTick.offset',
    'LegendTick.children',
    'Legend.titleGap',
    'Node.font',
    'Node.align',
    'Legend.contentAlign',
    'Legend.direction',
    'Legend.wrap',
    'Legend.sampleAlign',
    'Legend.columnGap',
    'Legend.rowGap',
    'Legend.sampleGap',
    'Legend.padding',
    'Legend.overflow',
  ],
} satisfies PreviewControlContract;

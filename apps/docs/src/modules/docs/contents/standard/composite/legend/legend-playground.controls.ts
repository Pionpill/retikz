import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Legend 排列、间距与边界行为的中文属性面板 */
export const legendPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '图例参数',
  sections: [
    {
      label: '内容',
      controls: [
        { kind: 'text', id: 'title', label: '标题', defaultValue: 'A–D', multiline: true },
        {
          kind: 'select',
          id: 'kind',
          label: '图例类型',
          defaultValue: 'items',
          options: [
            { value: 'items', label: '离散条目' },
            { value: 'ramp', label: '连续样本' },
          ],
        },
      ],
    },
    {
      label: '标题样式',
      controls: [
        { kind: 'range', id: 'titleFontSize', label: '字号', defaultValue: 16, min: 12, max: 24, step: 1 },
        {
          kind: 'select',
          id: 'titleFontWeight',
          label: '字重',
          defaultValue: 'bold',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'bold', label: '粗体' },
          ],
        },
        {
          kind: 'select',
          id: 'titleFontStyle',
          label: '字形',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'italic', label: '斜体' },
          ],
        },
        {
          kind: 'select',
          id: 'titleAlign',
          label: '多行标题对齐',
          defaultValue: 'start',
          options: [
            { value: 'start', label: '起始' },
            { value: 'middle', label: '居中' },
            { value: 'end', label: '末尾' },
          ],
        },
      ],
    },
    {
      label: '排列',
      controls: [
        {
          kind: 'select',
          id: 'contentAlign',
          label: '内容区域对齐',
          defaultValue: 'start',
          options: [
            { value: 'start', label: '起始' },
            { value: 'center', label: '居中' },
            { value: 'end', label: '末尾' },
          ],
        },
        {
          kind: 'select',
          id: 'direction',
          label: '主轴方向',
          defaultValue: 'horizontal',
          options: [
            { value: 'vertical', label: '纵向' },
            { value: 'horizontal', label: '横向' },
          ],
        },
        {
          kind: 'select',
          id: 'wrap',
          label: '换行',
          defaultValue: 'wrap',
          options: [
            { value: 'nowrap', label: '不换行' },
            { value: 'wrap', label: '换行' },
          ],
          visibleWhen: { controlId: 'kind', oneOf: ['items'] },
        },
        {
          kind: 'select',
          id: 'sampleAlign',
          label: '样本对齐',
          defaultValue: 'center',
          options: [
            { value: 'start', label: '顶部' },
            { value: 'center', label: '居中' },
            { value: 'end', label: '底部' },
          ],
          visibleWhen: { controlId: 'kind', oneOf: ['items'] },
        },
      ],
    },
    {
      label: '间距',
      controls: [
        { kind: 'range', id: 'titleGap', label: '标题与内容', defaultValue: 8, min: 0, max: 24, step: 2 },
        {
          kind: 'range',
          id: 'columnGap',
          label: '列间距',
          defaultValue: 12,
          min: 0,
          max: 28,
          step: 2,
          visibleWhen: { controlId: 'kind', oneOf: ['items'] },
        },
        {
          kind: 'range',
          id: 'rowGap',
          label: '行间距',
          defaultValue: 10,
          min: 0,
          max: 24,
          step: 2,
          visibleWhen: { controlId: 'kind', oneOf: ['items'] },
        },
        { kind: 'range', id: 'sampleGap', label: '样本与标签', defaultValue: 8, min: 0, max: 24, step: 2 },
        { kind: 'range', id: 'padding', label: '容器内边距', defaultValue: 12, min: 0, max: 24, step: 2 },
      ],
    },
    {
      label: '边界',
      controls: [
        {
          kind: 'select',
          id: 'overflow',
          label: '视觉溢出',
          defaultValue: 'visible',
          options: [
            { value: 'visible', label: '可见' },
            { value: 'clip', label: '裁切' },
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

/** 当前 Legend playground 的稳定文档契约 */
export const previewControlContract = {
  controls: legendPlaygroundControls,
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

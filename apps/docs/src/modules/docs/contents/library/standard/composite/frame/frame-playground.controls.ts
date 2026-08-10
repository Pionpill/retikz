import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Frame 布局、边框与标题区 Node 样式的中文属性面板 */
export const framePlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Frame 参数',
  sections: [
    {
      label: '布局',
      controls: [
        { kind: 'range', id: 'paddingX', label: '水平内边距', defaultValue: 8, min: 0, max: 32, step: 2 },
        { kind: 'range', id: 'paddingY', label: '垂直内边距', defaultValue: 8, min: 0, max: 24, step: 2 },
        { kind: 'range', id: 'gap', label: '标题区间距', defaultValue: 4, min: 0, max: 24, step: 2 },
        {
          kind: 'select',
          id: 'headerDirection',
          label: '标题区方向',
          defaultValue: 'horizontal',
          options: [
            { value: 'horizontal', label: '横向' },
            { value: 'vertical', label: '纵向' },
          ],
        },
      ],
    },
    {
      label: '边框',
      controls: [
        {
          kind: 'select',
          id: 'borderStroke',
          label: '描边',
          defaultValue: 'currentColor',
          options: [
            { value: 'currentColor', label: '当前文字色' },
            { value: 'dimgray', label: '深灰' },
            { value: 'dodgerblue', label: '蓝色' },
            { value: 'darkorange', label: '橙色' },
          ],
        },
        { kind: 'range', id: 'strokeWidth', label: '描边宽度', defaultValue: 1, min: 0.5, max: 4, step: 0.5 },
        { kind: 'range', id: 'strokeOpacity', label: '描边透明度', defaultValue: 1, min: 0.1, max: 1, step: 0.1 },
        { kind: 'range', id: 'borderCornerRadius', label: '圆角半径', defaultValue: 0, min: 0, max: 16, step: 2 },
        {
          kind: 'select',
          id: 'borderLineStyle',
          label: '边框线型',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: '实线' },
            { value: 'dashed', label: '虚线' },
            { value: 'dotted', label: '点线' },
          ],
        },
        { kind: 'range', id: 'fillOpacity', label: '填充透明度', defaultValue: 0, min: 0, max: 0.3, step: 0.05 },
      ],
    },
    {
      label: '标题与说明',
      controls: [
        { kind: 'range', id: 'titlePadding', label: '标题内边距', defaultValue: 0, min: 0, max: 12, step: 2 },
        {
          kind: 'select',
          id: 'titleFontSize',
          label: '标题字号',
          defaultValue: 'sm',
          options: [
            { value: 'xs', label: 'xs' },
            { value: 'sm', label: 'sm' },
            { value: 'base', label: 'base' },
            { value: 'lg', label: 'lg' },
          ],
        },
        { kind: 'range', id: 'titleFontWeight', label: '标题字重', defaultValue: 600, min: 400, max: 700, step: 100 },
        {
          kind: 'range',
          id: 'titleFillOpacity',
          label: '标题填充透明度',
          defaultValue: 0,
          min: 0,
          max: 0.24,
          step: 0.04,
        },
        {
          kind: 'select',
          id: 'descriptionFontSize',
          label: '说明字号',
          defaultValue: 'xs',
          options: [
            { value: 'xs', label: 'xs' },
            { value: 'sm', label: 'sm' },
            { value: 'base', label: 'base' },
          ],
        },
        {
          kind: 'range',
          id: 'descriptionOpacity',
          label: '说明透明度',
          defaultValue: 0.7,
          min: 0.2,
          max: 1,
          step: 0.1,
        },
      ],
    },
    {
      label: '节点 A',
      controls: [{ kind: 'text', id: 'nodeAText', label: '内容', defaultValue: 'A' }],
    },
    {
      label: '节点 B',
      controls: [{ kind: 'text', id: 'nodeBText', label: '内容', defaultValue: 'B' }],
    },
    {
      label: '节点关系',
      controls: [{ kind: 'switch', id: 'connected', label: '连接 A 与 B', defaultValue: true }],
    },
  ],
});

/** 当前 Frame playground 的稳定文档契约 */
export const previewControlContract = {
  controls: framePlaygroundControls,
  canonicalValues: {
    paddingX: 8,
    paddingY: 8,
    gap: 4,
    headerDirection: 'horizontal',
    borderStroke: 'currentColor',
    strokeWidth: 1,
    strokeOpacity: 1,
    borderCornerRadius: 0,
    borderLineStyle: 'solid',
    fillOpacity: 0,
    titlePadding: 0,
    titleFontSize: 'sm',
    titleFontWeight: 600,
    titleFillOpacity: 0,
    descriptionFontSize: 'xs',
    descriptionOpacity: 0.7,
    nodeAText: 'A',
    nodeBText: 'B',
    connected: true,
  },
  relatedApis: [
    'Frame.padding',
    'Frame.gap',
    'Frame.headerDirection',
    'Frame.border',
    'Frame.border.style',
    'Frame.border.cornerRadius',
    'FrameTitle.padding',
    'FrameTitle.font',
    'FrameTitle.fill',
    'FrameTitle.fillOpacity',
    'FrameDescription.font',
    'FrameDescription.opacity',
    'Node.text',
    'Draw.way',
  ],
} satisfies PreviewControlContract;

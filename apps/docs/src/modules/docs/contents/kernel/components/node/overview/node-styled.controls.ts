import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Node 属性面板使用的稳定字段 id */
export const NodeStyledControlId = {
  FontFamily: 'fontFamily',
  FontSize: 'fontSize',
  FontWeight: 'fontWeight',
  FontStyle: 'fontStyle',
  Fill: 'fill',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
  Dashed: 'dashed',
  Opacity: 'opacity',
} as const;

/** Node 样式演示的中文属性面板定义 */
export const nodeStyledControls = definePreviewControls({
  presentation: 'panel',
  title: '属性',
  sections: [
    {
      label: '字体',
      controls: [
        {
          kind: 'select',
          id: NodeStyledControlId.FontFamily,
          label: '字族',
          defaultValue: 'sans-serif',
          options: [
            { value: 'sans-serif', label: '无衬线' },
            { value: 'serif', label: '衬线' },
            { value: 'monospace', label: '等宽' },
          ],
        },
        {
          kind: 'range',
          id: NodeStyledControlId.FontSize,
          label: '字号',
          defaultValue: 16,
          min: 10,
          max: 28,
          step: 1,
        },
        {
          kind: 'select',
          id: NodeStyledControlId.FontWeight,
          label: '字重',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'bold', label: '粗体' },
          ],
        },
        {
          kind: 'select',
          id: NodeStyledControlId.FontStyle,
          label: '字形',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'italic', label: '斜体' },
          ],
        },
      ],
    },
    {
      label: '外观',
      controls: [
        {
          kind: 'color',
          id: NodeStyledControlId.Fill,
          label: '填充色',
          defaultValue: '#e2e8f0',
        },
        {
          kind: 'color',
          id: NodeStyledControlId.Stroke,
          label: '描边色',
          defaultValue: '#f97316',
        },
        {
          kind: 'number',
          id: NodeStyledControlId.StrokeWidth,
          label: '描边宽度',
          defaultValue: 2,
          min: 0,
          max: 12,
          step: 0.5,
        },
        {
          kind: 'switch',
          id: NodeStyledControlId.Dashed,
          label: '虚线',
          defaultValue: false,
        },
        {
          kind: 'range',
          id: NodeStyledControlId.Opacity,
          label: '透明度',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Node 样式面板的稳定文档契约 */
export const previewControlContract = {
  controls: nodeStyledControls,
  canonicalValues: {
    fontFamily: 'sans-serif',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fill: '#e2e8f0',
    stroke: '#f97316',
    strokeWidth: 2,
    dashed: false,
    opacity: 1,
  },
  relatedApis: ['Node.font', 'Node.fill', 'Node.stroke', 'Node.strokeWidth', 'Node.dashed', 'Node.opacity'],
} satisfies PreviewControlContract;

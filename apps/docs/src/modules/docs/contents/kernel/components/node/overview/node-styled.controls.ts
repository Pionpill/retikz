import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Node 属性面板使用的稳定字段 id */
export const NodeStyledControlId = {
  Text: 'text',
  Shape: 'shape',
  Fill: 'fill',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
  Dashed: 'dashed',
  Opacity: 'opacity',
} as const;

/** Node 样式演示的中文属性面板定义 */
export const nodeStyledControls = definePreviewControls({
  presentation: 'panel',
  title: 'Node 属性',
  sections: [
    {
      label: '内容',
      controls: [
        {
          kind: 'text',
          id: NodeStyledControlId.Text,
          label: '文本',
          defaultValue: 'Node',
        },
        {
          kind: 'select',
          id: NodeStyledControlId.Shape,
          label: '形状',
          defaultValue: 'rectangle',
          options: [
            { value: 'rectangle', label: '矩形' },
            { value: 'circle', label: '圆形' },
            { value: 'ellipse', label: '椭圆' },
            { value: 'diamond', label: '菱形' },
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

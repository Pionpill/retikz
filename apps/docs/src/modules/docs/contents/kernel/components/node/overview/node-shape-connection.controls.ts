import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Node 形状与连接 playground 使用的稳定字段 id */
export const NodeShapeConnectionControlId = {
  ShapeA: 'shapeA',
  BoundaryA: 'boundaryA',
  AnchorA: 'anchorA',
  ShapeB: 'shapeB',
  BoundaryB: 'boundaryB',
  AnchorB: 'anchorB',
} as const;

const shapeOptions = [
  { value: 'rectangle', label: '矩形' },
  { value: 'circle', label: '圆形' },
  { value: 'ellipse', label: '椭圆' },
  { value: 'diamond', label: '菱形' },
  { value: 'polygon', label: '六边形' },
  { value: 'star', label: '星形' },
  { value: 'sector', label: '扇环' },
  { value: 'arc', label: '圆弧' },
] as const;

const boundaryOptions = [
  { value: 'shape', label: '视觉形状' },
  { value: 'circle', label: '圆形连接面' },
  { value: 'rectangle', label: '矩形连接面' },
  { value: 'ellipse', label: '椭圆连接面' },
] as const;

const anchorOptions = [
  { value: 'auto', label: '自动贴边' },
  { value: 'center', label: 'center' },
  { value: 'top', label: 'top' },
  { value: 'top-right', label: 'top-right' },
  { value: 'right', label: 'right' },
  { value: 'bottom-right', label: 'bottom-right' },
  { value: 'bottom', label: 'bottom' },
  { value: 'bottom-left', label: 'bottom-left' },
  { value: 'left', label: 'left' },
  { value: 'top-left', label: 'top-left' },
] as const;

/** Node 形状、连接面与命名锚点的中文属性面板 */
export const nodeShapeConnectionControls = definePreviewControls({
  presentation: 'panel',
  title: '形状',
  sections: [
    {
      label: '节点 A',
      controls: [
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.ShapeA,
          label: 'shape',
          defaultValue: 'star',
          options: shapeOptions,
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.BoundaryA,
          label: 'boundary',
          defaultValue: 'circle',
          options: boundaryOptions,
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.AnchorA,
          label: 'anchor',
          defaultValue: 'auto',
          options: anchorOptions,
        },
      ],
    },
    {
      label: '节点 B',
      controls: [
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.ShapeB,
          label: 'shape',
          defaultValue: 'ellipse',
          options: shapeOptions,
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.BoundaryB,
          label: 'boundary',
          defaultValue: 'shape',
          options: boundaryOptions,
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.AnchorB,
          label: 'anchor',
          defaultValue: 'auto',
          options: anchorOptions,
        },
      ],
    },
  ],
});

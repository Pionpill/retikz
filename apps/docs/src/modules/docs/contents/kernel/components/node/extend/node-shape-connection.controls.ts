import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

/** Node 形状与连接 playground 使用的稳定字段 id */
export const NodeShapeConnectionControlId = {
  ShapeA: 'shapeA',
  BoundaryA: 'boundaryA',
  FitA: 'fitA',
  GapA: 'gapA',
  AnchorA: 'anchorA',
  ShapeB: 'shapeB',
  BoundaryB: 'boundaryB',
  FitB: 'fitB',
  GapB: 'gapB',
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
] as const;

const boundaryOptions = [
  { value: 'shape', label: '视觉形状' },
  { value: 'circle', label: '圆形连接面' },
  { value: 'rectangle', label: '矩形连接面' },
  { value: 'ellipse', label: '椭圆连接面' },
] as const;

const fitOptions = [
  { value: 'tight', label: '贴合形状' },
  { value: 'bounds', label: '包住外接框' },
] as const;

const anchorOptions = [
  { value: 'auto', label: '自动贴边' },
  { value: 'center', label: '中心' },
  { value: 'top', label: '上' },
  { value: 'top-right', label: '右上' },
  { value: 'right', label: '右' },
  { value: 'bottom-right', label: '右下' },
  { value: 'bottom', label: '下' },
  { value: 'bottom-left', label: '左下' },
  { value: 'left', label: '左' },
  { value: 'top-left', label: '左上' },
] as const;

/** Node 形状、连接面与命名锚点的中文属性面板 */
export const nodeShapeConnectionControls = definePreviewControls({
  presentation: 'panel',
  defaultSize: 50,
  title: '形状',
  sections: [
    {
      label: '节点 A',
      controls: [
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.ShapeA,
          label: '形状',
          defaultValue: 'star',
          options: shapeOptions,
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.BoundaryA,
          label: '连接面',
          defaultValue: 'circle',
          options: boundaryOptions,
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.FitA,
          label: '贴合方式',
          defaultValue: 'tight',
          options: fitOptions,
          visibleWhen: { controlId: NodeShapeConnectionControlId.BoundaryA, oneOf: ['circle', 'rectangle', 'ellipse'] },
        },
        {
          kind: 'range',
          id: NodeShapeConnectionControlId.GapA,
          label: '间距',
          defaultValue: 0,
          min: -12,
          max: 28,
          step: 2,
          visibleWhen: { controlId: NodeShapeConnectionControlId.BoundaryA, oneOf: ['circle', 'rectangle', 'ellipse'] },
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.AnchorA,
          label: '锚点',
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
          label: '形状',
          defaultValue: 'ellipse',
          options: shapeOptions,
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.BoundaryB,
          label: '连接面',
          defaultValue: 'ellipse',
          options: boundaryOptions,
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.FitB,
          label: '贴合方式',
          defaultValue: 'tight',
          options: fitOptions,
          visibleWhen: { controlId: NodeShapeConnectionControlId.BoundaryB, oneOf: ['circle', 'rectangle', 'ellipse'] },
        },
        {
          kind: 'range',
          id: NodeShapeConnectionControlId.GapB,
          label: '间距',
          defaultValue: 0,
          min: -12,
          max: 28,
          step: 2,
          visibleWhen: { controlId: NodeShapeConnectionControlId.BoundaryB, oneOf: ['circle', 'rectangle', 'ellipse'] },
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.AnchorB,
          label: '锚点',
          defaultValue: 'auto',
          options: anchorOptions,
        },
      ],
    },
  ],
});

/** Node 形状与连接面板的稳定文档契约 */
export const previewControlContract = {
  controls: nodeShapeConnectionControls,
  canonicalValues: {
    shapeA: 'star',
    boundaryA: 'circle',
    fitA: 'tight',
    gapA: 0,
    anchorA: 'auto',
    shapeB: 'ellipse',
    boundaryB: 'ellipse',
    fitB: 'tight',
    gapB: 0,
    anchorB: 'auto',
  },
  relatedApis: ['Node.shape', 'Node.boundary', 'Draw.way'],
} satisfies PreviewControlContract;

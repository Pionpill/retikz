import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Node 定位 playground 使用的稳定字段 id */
export const NodePositionControlId = {
  Kind: 'positionKind',
  Referent: 'referent',
  X: 'x',
  Y: 'y',
  Angle: 'angle',
  Radius: 'radius',
  Direction: 'direction',
  Distance: 'distance',
  OffsetX: 'offsetX',
  OffsetY: 'offsetY',
  Fraction: 'fraction',
} as const;

/** Node 定位字段按输入形态显示的共享条件 */
export const NodePositionVisibleWhen = {
  Referent: { controlId: NodePositionControlId.Kind, oneOf: ['polar', 'relative', 'offset'] },
  Cartesian: { controlId: NodePositionControlId.Kind, oneOf: ['cartesian'] },
  Polar: { controlId: NodePositionControlId.Kind, oneOf: ['polar'] },
  Relative: { controlId: NodePositionControlId.Kind, oneOf: ['relative'] },
  Offset: { controlId: NodePositionControlId.Kind, oneOf: ['offset'] },
  Between: { controlId: NodePositionControlId.Kind, oneOf: ['between'] },
} as const;

/** Node 五种定位输入的中文属性面板 */
export const nodePositionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Node 定位',
  sections: [
    {
      label: '定位方式',
      controls: [
        {
          kind: 'select',
          id: NodePositionControlId.Kind,
          label: 'position',
          defaultValue: 'relative',
          options: [
            { value: 'cartesian', label: '笛卡尔坐标' },
            { value: 'polar', label: '极坐标' },
            { value: 'relative', label: '方向相对定位' },
            { value: 'offset', label: '引用点偏移' },
            { value: 'between', label: '两点之间' },
          ],
        },
        {
          kind: 'select',
          id: NodePositionControlId.Referent,
          label: '参照点',
          defaultValue: 'A',
          visibleWhen: NodePositionVisibleWhen.Referent,
          options: [
            { value: 'A', label: 'A（左）' },
            { value: 'B', label: 'B（右）' },
          ],
        },
      ],
    },
    {
      label: '坐标参数',
      controls: [
        {
          kind: 'range',
          id: NodePositionControlId.X,
          label: 'x',
          defaultValue: 0,
          min: -140,
          max: 140,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Cartesian,
        },
        {
          kind: 'range',
          id: NodePositionControlId.Y,
          label: 'y',
          defaultValue: -40,
          min: -100,
          max: 120,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Cartesian,
        },
        {
          kind: 'range',
          id: NodePositionControlId.Angle,
          label: '角度',
          defaultValue: -90,
          min: -180,
          max: 180,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Polar,
        },
        {
          kind: 'range',
          id: NodePositionControlId.Radius,
          label: '半径',
          defaultValue: 90,
          min: 20,
          max: 120,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Polar,
        },
      ],
    },
    {
      label: '相对参数',
      controls: [
        {
          kind: 'select',
          id: NodePositionControlId.Direction,
          label: '方向',
          defaultValue: 'top',
          visibleWhen: NodePositionVisibleWhen.Relative,
          options: [
            { value: 'top', label: '上' },
            { value: 'top-right', label: '右上' },
            { value: 'right', label: '右' },
            { value: 'bottom-right', label: '右下' },
            { value: 'bottom', label: '下' },
            { value: 'bottom-left', label: '左下' },
            { value: 'left', label: '左' },
            { value: 'top-left', label: '左上' },
          ],
        },
        {
          kind: 'range',
          id: NodePositionControlId.Distance,
          label: '距离',
          defaultValue: 90,
          min: 20,
          max: 120,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Relative,
        },
        {
          kind: 'range',
          id: NodePositionControlId.OffsetX,
          label: 'offset x',
          defaultValue: 80,
          min: -120,
          max: 120,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Offset,
        },
        {
          kind: 'range',
          id: NodePositionControlId.OffsetY,
          label: 'offset y',
          defaultValue: -70,
          min: -100,
          max: 60,
          step: 5,
          visibleWhen: NodePositionVisibleWhen.Offset,
        },
        {
          kind: 'range',
          id: NodePositionControlId.Fraction,
          label: 'A → B 比例',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: NodePositionVisibleWhen.Between,
        },
      ],
    },
  ],
});

/** Node 定位面板的稳定文档契约 */
export const previewControlContract = {
  controls: nodePositionControls,
  canonicalValues: {
    positionKind: 'relative',
    referent: 'A',
    x: 0,
    y: -40,
    angle: -90,
    radius: 90,
    direction: 'top',
    distance: 90,
    offsetX: 80,
    offsetY: -70,
    fraction: 0.5,
  },
  relatedApis: ['Node.position'],
} satisfies PreviewControlContract;

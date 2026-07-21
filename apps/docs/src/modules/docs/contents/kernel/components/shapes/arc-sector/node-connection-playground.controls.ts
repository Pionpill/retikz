import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Arc 与 Sector 节点连接 playground 使用的稳定字段 id */
export const ArcSectorNodeConnectionControlId = {
  Shape: 'shape',
  CornerRadius: 'cornerRadius',
  SourceAngle: 'sourceAngle',
  SourceDistance: 'sourceDistance',
  Anchor: 'anchor',
} as const;

/** 扇形圆角仅在选择 Sector 时显示 */
export const ArcSectorNodeConnectionVisibleWhen = {
  CornerRadius: { controlId: ArcSectorNodeConnectionControlId.Shape, oneOf: ['sector'] },
} as const;

/** Arc 与 Sector 节点连接的中文属性面板 */
export const nodeConnectionPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '连接位置',
  sections: [
    {
      label: '目标节点',
      controls: [
        {
          kind: 'select',
          id: ArcSectorNodeConnectionControlId.Shape,
          label: 'shape',
          defaultValue: 'sector',
          options: [
            { value: 'sector', label: '扇形' },
            { value: 'arc', label: '弧形' },
          ],
        },
        {
          kind: 'range',
          id: ArcSectorNodeConnectionControlId.CornerRadius,
          label: '扇形圆角',
          defaultValue: 12,
          min: 0,
          max: 18,
          step: 1,
          visibleWhen: ArcSectorNodeConnectionVisibleWhen.CornerRadius,
        },
        {
          kind: 'select',
          id: ArcSectorNodeConnectionControlId.Anchor,
          label: 'anchor',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: '自动贴边' },
            { value: 'center', label: 'center' },
            { value: 'start', label: '起点侧' },
            { value: 'midpoint', label: '弧中点' },
            { value: 'inner-midpoint', label: '内弧中点' },
            { value: 'end', label: '终点侧' },
          ],
        },
      ],
    },
    {
      label: '来源节点',
      controls: [
        {
          kind: 'range',
          id: ArcSectorNodeConnectionControlId.SourceAngle,
          label: '轨道角度',
          defaultValue: 155,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: ArcSectorNodeConnectionControlId.SourceDistance,
          label: '轨道距离',
          defaultValue: 125,
          min: 90,
          max: 200,
          step: 5,
        },
      ],
    },
  ],
});

/** Arc 与 Sector 节点连接 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: nodeConnectionPlaygroundControls,
  canonicalValues: { shape: 'sector', cornerRadius: 12, sourceAngle: 155, sourceDistance: 125, anchor: 'auto' },
  presets: [
    { id: 'arc-auto', label: '弧形自动贴边', values: { shape: 'arc', sourceAngle: 145, anchor: 'auto' } },
    { id: 'sector-sharp', label: '扇形硬角', values: { shape: 'sector', cornerRadius: 0, anchor: 'auto' } },
    { id: 'sector-midpoint', label: '扇形弧中点', values: { shape: 'sector', anchor: 'midpoint' } },
    { id: 'sector-inner-midpoint', label: '扇形内弧中点', values: { shape: 'sector', anchor: 'inner-midpoint' } },
    { id: 'arc-end', label: '弧形终点', values: { shape: 'arc', anchor: 'end' } },
  ],
  relatedApis: ['Node.shape', 'Node.shape.params.cornerRadius', 'Node.position', 'Draw.way', 'IRNodeTarget.anchor'],
} satisfies PreviewControlContract;

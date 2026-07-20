import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** 求交 playground 的稳定字段 id */
export const IntersectionControlId = {
  Kind: 'kind',
  Offset: 'offset',
  Angle: 'angle',
  Radius: 'radius',
} as const;

/** 求交算法分支对应的共享显示条件 */
export const IntersectionVisibleWhen = {
  LineLine: { controlId: IntersectionControlId.Kind, oneOf: ['lineLine'] },
  Circle: { controlId: IntersectionControlId.Kind, oneOf: ['lineCircle', 'circleCircle'] },
} as const;

/** 求交算法与几何输入的中文属性面板 */
export const intersectionPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '求交',
  sections: [
    {
      label: '算法',
      controls: [
        {
          kind: 'select',
          id: IntersectionControlId.Kind,
          label: '类型',
          defaultValue: 'lineCircle',
          options: [
            { value: 'lineLine', label: '直线与直线' },
            { value: 'lineCircle', label: '直线与圆' },
            { value: 'circleCircle', label: '圆与圆' },
          ],
        },
      ],
    },
    {
      label: '几何输入',
      controls: [
        {
          kind: 'range',
          id: IntersectionControlId.Offset,
          label: '偏移',
          defaultValue: 25,
          min: -100,
          max: 100,
          step: 5,
        },
        {
          kind: 'range',
          id: IntersectionControlId.Angle,
          label: '夹角',
          defaultValue: 65,
          min: 0,
          max: 180,
          step: 5,
          visibleWhen: IntersectionVisibleWhen.LineLine,
        },
        {
          kind: 'range',
          id: IntersectionControlId.Radius,
          label: '半径',
          defaultValue: 70,
          min: 30,
          max: 90,
          step: 5,
          visibleWhen: IntersectionVisibleWhen.Circle,
        },
      ],
    },
  ],
});

/** 求交 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: intersectionPlaygroundControls,
  canonicalValues: { kind: 'lineCircle', offset: 25, angle: 65, radius: 70 },
  presets: [
    {
      id: 'crossing-lines',
      label: '相交直线',
      values: { kind: 'lineLine', offset: 10, angle: 65, radius: 70 },
    },
    {
      id: 'parallel-lines',
      label: '平行直线',
      values: { kind: 'lineLine', offset: 45, angle: 0, radius: 70 },
    },
    {
      id: 'tangent-line-circle',
      label: '直线与圆相切',
      values: { kind: 'lineCircle', offset: 70, angle: 65, radius: 70 },
    },
    {
      id: 'disjoint-circles',
      label: '两圆相离',
      values: { kind: 'circleCircle', offset: 70, angle: 65, radius: 55 },
    },
  ],
  relatedApis: ['intersect.lineLine', 'intersect.lineCircle', 'intersect.circleCircle'],
} satisfies PreviewControlContract;

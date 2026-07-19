import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Coordinate 汇聚点 demo 使用的稳定字段 id */
export const CoordinateFoldJunctionControlId = {
  JunctionX: 'junctionX',
  JunctionY: 'junctionY',
} as const;

/** Coordinate 汇聚点 playground 的固定取景 */
export const coordinateFoldJunctionFrame = {
  width: 360,
  height: 220,
  viewBox: { x: -180, y: -110, width: 360, height: 220 },
} as const;

/** Coordinate 汇聚点的中文属性面板 */
export const coordinateFoldJunctionControls = definePreviewControls({
  presentation: 'panel',
  title: '路径汇聚',
  sections: [
    {
      label: 'position',
      controls: [
        {
          kind: 'range',
          id: CoordinateFoldJunctionControlId.JunctionX,
          label: 'position x',
          defaultValue: 0,
          min: -40,
          max: 40,
          step: 10,
        },
        {
          kind: 'range',
          id: CoordinateFoldJunctionControlId.JunctionY,
          label: 'position y',
          defaultValue: 0,
          min: -40,
          max: 40,
          step: 10,
        },
      ],
    },
  ],
});

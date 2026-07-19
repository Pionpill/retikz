import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Coordinate between demo 使用的稳定字段 id */
export const CoordinateBetweenControlId = {
  Fraction: 'fraction',
} as const;

/** Coordinate 比例定位 playground 的固定取景 */
export const coordinateBetweenFrame = {
  width: 400,
  height: 150,
  viewBox: { x: -200, y: -75, width: 400, height: 150 },
} as const;

/** 两点比例位置的中文属性面板 */
export const coordinateBetweenControls = definePreviewControls({
  presentation: 'panel',
  title: '比例定位',
  sections: [
    {
      label: 'between',
      controls: [
        {
          kind: 'range',
          id: CoordinateBetweenControlId.Fraction,
          label: 'fraction',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

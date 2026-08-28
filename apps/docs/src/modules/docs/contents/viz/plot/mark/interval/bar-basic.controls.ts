import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { revenue } from './bar-basic.data';

/** 基础柱形 playground 的稳定控件 id */
export const BAR_POSITION_CONTROL_IDS = {
  coordinate: 'interval-basic-coordinate',
  direction: 'bar-position-direction',
  gap: 'bar-position-gap',
  cornerRadius: 'bar-position-corner-radius',
  fillOpacity: 'bar-position-fill-opacity',
  strokeWidth: 'bar-position-stroke-width',
  showLabels: 'bar-position-show-labels',
  shadow: 'bar-position-shadow',
} as const;

/** 基础柱形的中文属性面板 */
export const barPositionControls = definePreviewControls({
  presentation: 'panel',
  title: '基础区间',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'revenue', label: '季度收入', rows: revenue }],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: BAR_POSITION_CONTROL_IDS.coordinate,
          label: '投影',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: '笛卡尔坐标' },
            { value: 'polar2D', label: '极坐标' },
          ],
        },
      ],
    },
    {
      label: '布局',
      controls: [
        {
          kind: 'select',
          id: BAR_POSITION_CONTROL_IDS.direction,
          label: '方向',
          defaultValue: 'vertical',
          visibleWhen: { controlId: BAR_POSITION_CONTROL_IDS.coordinate, oneOf: ['cartesian2D'] },
          options: [
            { value: 'vertical', label: '纵向' },
            { value: 'horizontal', label: '横向' },
          ],
        },
        {
          kind: 'range',
          id: BAR_POSITION_CONTROL_IDS.gap,
          label: '分类间距',
          defaultValue: 0,
          min: 0,
          max: 0.8,
          step: 0.05,
        },
      ],
    },
    {
      label: '外观',
      controls: [
        {
          kind: 'range',
          id: BAR_POSITION_CONTROL_IDS.cornerRadius,
          label: '圆角',
          defaultValue: 6,
          min: 0,
          max: 20,
          step: 1,
        },
        {
          kind: 'range',
          id: BAR_POSITION_CONTROL_IDS.fillOpacity,
          label: '填充透明度',
          defaultValue: 0.9,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: BAR_POSITION_CONTROL_IDS.strokeWidth,
          label: '描边宽度',
          defaultValue: 1,
          min: 0,
          max: 4,
          step: 0.5,
        },
        { kind: 'switch', id: BAR_POSITION_CONTROL_IDS.showLabels, label: '显示标签', defaultValue: true },
        { kind: 'switch', id: BAR_POSITION_CONTROL_IDS.shadow, label: '显示阴影', defaultValue: false },
      ],
    },
  ],
});

/** 基础柱形 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: barPositionControls,
  canonicalValues: {
    [BAR_POSITION_CONTROL_IDS.coordinate]: 'cartesian2D',
    [BAR_POSITION_CONTROL_IDS.direction]: 'vertical',
    [BAR_POSITION_CONTROL_IDS.gap]: 0,
    [BAR_POSITION_CONTROL_IDS.cornerRadius]: 6,
    [BAR_POSITION_CONTROL_IDS.fillOpacity]: 0.9,
    [BAR_POSITION_CONTROL_IDS.strokeWidth]: 1,
    [BAR_POSITION_CONTROL_IDS.showLabels]: true,
    [BAR_POSITION_CONTROL_IDS.shadow]: false,
  },
  relatedApis: [
    'Plot.coordinate',
    'IntervalMark.x',
    'IntervalMark.y',
    'IntervalMark.direction',
    'PlotScale.paddingInner',
    'PlotScale.paddingOuter',
    'IntervalMark.cornerRadius',
    'IntervalMark.fillOpacity',
    'IntervalMark.strokeWidth',
    'IntervalMark.label',
    'IntervalMark.shadow',
  ],
} satisfies PreviewControlContract;

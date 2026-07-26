import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { traffic } from './interval-sector.data';

/** 极坐标扇区 playground 的稳定控件 id */
export const INTERVAL_SECTOR_CONTROL_IDS = {
  innerRadius: 'interval-sector-inner-radius',
  padAngle: 'interval-sector-pad-angle',
  pullDistance: 'interval-sector-pull-distance',
  showLabels: 'interval-sector-show-labels',
} as const;

/** 极坐标扇区的中文属性面板 */
export const intervalSectorControls = definePreviewControls({
  presentation: 'panel',
  title: '极坐标扇区',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'traffic', label: '流量来源', rows: traffic }],
    },
    {
      label: '扇区',
      controls: [
        {
          kind: 'range',
          id: INTERVAL_SECTOR_CONTROL_IDS.innerRadius,
          label: '内半径',
          defaultValue: 0.55,
          min: 0,
          max: 0.8,
          step: 0.05,
        },
        {
          kind: 'range',
          id: INTERVAL_SECTOR_CONTROL_IDS.padAngle,
          label: '扇区间隔',
          defaultValue: 2,
          min: 0,
          max: 10,
          step: 1,
        },
        {
          kind: 'range',
          id: INTERVAL_SECTOR_CONTROL_IDS.pullDistance,
          label: 'Search 外拉距离',
          defaultValue: 0,
          min: 0,
          max: 28,
          step: 2,
        },
        {
          kind: 'switch',
          id: INTERVAL_SECTOR_CONTROL_IDS.showLabels,
          label: '显示标签',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** 极坐标扇区 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: intervalSectorControls,
  canonicalValues: {
    [INTERVAL_SECTOR_CONTROL_IDS.innerRadius]: 0.55,
    [INTERVAL_SECTOR_CONTROL_IDS.padAngle]: 2,
    [INTERVAL_SECTOR_CONTROL_IDS.pullDistance]: 0,
    [INTERVAL_SECTOR_CONTROL_IDS.showLabels]: true,
  },
  presets: [
    {
      id: 'pie',
      label: '饼图',
      values: {
        [INTERVAL_SECTOR_CONTROL_IDS.innerRadius]: 0,
        [INTERVAL_SECTOR_CONTROL_IDS.padAngle]: 0,
        [INTERVAL_SECTOR_CONTROL_IDS.pullDistance]: 0,
        [INTERVAL_SECTOR_CONTROL_IDS.showLabels]: false,
      },
    },
    {
      id: 'donut',
      label: '环图',
      values: {
        [INTERVAL_SECTOR_CONTROL_IDS.innerRadius]: 0.55,
        [INTERVAL_SECTOR_CONTROL_IDS.padAngle]: 2,
        [INTERVAL_SECTOR_CONTROL_IDS.pullDistance]: 0,
        [INTERVAL_SECTOR_CONTROL_IDS.showLabels]: true,
      },
    },
    {
      id: 'exploded',
      label: '突出扇区',
      values: {
        [INTERVAL_SECTOR_CONTROL_IDS.innerRadius]: 0.55,
        [INTERVAL_SECTOR_CONTROL_IDS.padAngle]: 2,
        [INTERVAL_SECTOR_CONTROL_IDS.pullDistance]: 18,
        [INTERVAL_SECTOR_CONTROL_IDS.showLabels]: true,
      },
    },
  ],
  relatedApis: [
    'Plot.coordinate',
    'IntervalMark.angle',
    'IntervalMark.padAngle',
    'IntervalMark.pull',
    'IntervalMark.label',
  ],
} satisfies PreviewControlContract;

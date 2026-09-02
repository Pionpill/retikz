import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { polarTrackRows } from './coordinate-composition-tracks-polar.data';

/** 极坐标轨道 demo 的稳定控件 id */
export const COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS = {
  innerRadius: 'innerRadius',
  startAngle: 'startAngle',
  sweepAngle: 'sweepAngle',
  trackGap: 'trackGap',
  xGridVisible: 'xGridVisible',
  yGridVisible: 'yGridVisible',
  localAxes: 'localAxes',
  lineWidth: 'lineWidth',
  pointSize: 'pointSize',
  sectorPadAngle: 'sectorPadAngle',
  sectorOpacity: 'sectorOpacity',
} as const;

/** 极坐标轨道示例的中文控件 */
export const coordinateCompositionTracksPolarControls = definePreviewControls({
  presentation: 'panel',
  title: '极坐标轨道',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '业务环节指标',
          rows: polarTrackRows,
          columns: [{ key: 'area' }, { key: 'order' }, { key: 'signal' }, { key: 'capacity' }, { key: 'outer' }],
        },
      ],
    },
    {
      label: '极坐标',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.innerRadius,
          label: '内圈大小',
          defaultValue: 0,
          min: 0,
          max: 0.6,
          step: 0.05,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.startAngle,
          label: '起始角度',
          defaultValue: 0,
          min: -180,
          max: 180,
          step: 15,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sweepAngle,
          label: '扫过角度',
          defaultValue: 360,
          min: 90,
          max: 360,
          step: 15,
        },
      ],
    },
    {
      label: '轨道布局',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.trackGap,
          label: '轨道间距',
          defaultValue: 8,
          min: 0,
          max: 20,
          step: 2,
        },
      ],
    },
    {
      label: '坐标轴',
      controls: [
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.xGridVisible,
          label: '放射网格（x / 角度）',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.yGridVisible,
          label: '环形网格（y / 半径）',
          defaultValue: true,
          visibleWhen: {
            controlId: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.localAxes,
            oneOf: [true],
          },
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.localAxes,
          label: '显示本地径向轴',
          defaultValue: true,
        },
      ],
    },
    {
      label: '图层样式',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.lineWidth,
          label: '折线宽度',
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.pointSize,
          label: '数据点尺寸',
          defaultValue: 6,
          min: 3,
          max: 12,
          step: 1,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sectorPadAngle,
          label: '外环扇区间距',
          defaultValue: 2,
          min: 0,
          max: 8,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sectorOpacity,
          label: '外环透明度',
          defaultValue: 0.72,
          min: 0.1,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** 极坐标轨道示例的稳定文档契约 */
export const previewControlContract = {
  controls: coordinateCompositionTracksPolarControls,
  canonicalValues: {
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.innerRadius]: 0,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.startAngle]: 0,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sweepAngle]: 360,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.trackGap]: 8,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.xGridVisible]: true,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.yGridVisible]: true,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.localAxes]: true,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.lineWidth]: 2,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.pointSize]: 6,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sectorPadAngle]: 2,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sectorOpacity]: 0.72,
  },
  relatedApis: [
    'Plot.coordinate',
    'PlotScaffold.spacing',
    'PlotAxis.grid',
    'PathMark.strokeWidth',
    'PointMark.size',
    'IntervalMark.padAngle',
    'IntervalMark.fillOpacity',
  ],
} satisfies PreviewControlContract;

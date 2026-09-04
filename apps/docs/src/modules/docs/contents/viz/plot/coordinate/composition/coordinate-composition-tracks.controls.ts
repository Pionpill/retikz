import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { operationsRows } from './coordinate-composition-tracks.data';

/** 笛卡尔轨道 demo 的稳定控件 id */
export const COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS = {
  bandProfile: 'bandProfile',
  trackGap: 'trackGap',
  xGridVisible: 'xGridVisible',
  yGridVisible: 'yGridVisible',
  localAxes: 'localAxes',
  lineWidth: 'lineWidth',
  drawdownAreaVisible: 'drawdownAreaVisible',
  signalPointSize: 'signalPointSize',
} as const;

/** 共享横轴轨道示例的中文控件 */
export const coordinateCompositionTracksControls = definePreviewControls({
  presentation: 'panel',
  title: '共享横轴轨道',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '运行指标',
          rows: operationsRows,
          columns: [{ key: 'day' }, { key: 'trend' }, { key: 'drawdown' }, { key: 'signal' }],
        },
      ],
    },
    {
      label: '轨道布局',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.bandProfile,
          label: '空间分配',
          defaultValue: 'balanced',
          options: [
            { value: 'balanced', label: '均衡' },
            { value: 'trend-focus', label: '突出趋势' },
            { value: 'signal-focus', label: '突出信号' },
          ],
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.trackGap,
          label: '轨道间距',
          defaultValue: 6,
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
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.xGridVisible,
          label: '纵向网格（x 轴）',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.yGridVisible,
          label: '横向网格（y 轴）',
          defaultValue: true,
          visibleWhen: {
            controlId: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.localAxes,
            oneOf: [true],
          },
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.localAxes,
          label: '显示本地纵轴',
          defaultValue: true,
        },
      ],
    },
    {
      label: '图层样式',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.lineWidth,
          label: '折线宽度',
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.drawdownAreaVisible,
          label: '显示回撤面积',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.signalPointSize,
          label: '信号点尺寸',
          defaultValue: 7,
          min: 3,
          max: 14,
          step: 1,
        },
      ],
    },
  ],
});

/** 共享横轴轨道示例的稳定文档契约 */
export const previewControlContract = {
  controls: coordinateCompositionTracksControls,
  canonicalValues: {
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.bandProfile]: 'balanced',
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.trackGap]: 6,
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.xGridVisible]: true,
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.yGridVisible]: true,
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.localAxes]: true,
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.lineWidth]: 2,
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.drawdownAreaVisible]: true,
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.signalPointSize]: 7,
  },
  relatedApis: [
    'PlotScaffold.spacing',
    'PlotTrack.band',
    'PlotAxis.grid',
    'PathMark.strokeWidth',
    'PathMark.closure',
    'PointMark.size',
  ],
} satisfies PreviewControlContract;

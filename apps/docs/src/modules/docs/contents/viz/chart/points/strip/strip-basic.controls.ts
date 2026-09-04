import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateControl } from '../point-coordinate-control';
import { stripVegaBarleyData } from './strip-vega-barley.data';

/** Strip Chart 进阶示例的稳定控件 id */
export const STRIP_BASIC_CONTROL_IDS = {
  discreteRole: 'strip-basic-discrete-role',
  discreteScale: 'strip-basic-discrete-scale',
  coordinateSystem: 'strip-basic-coordinate-system',
  jitterSpan: 'strip-basic-jitter-span',
  seed: 'strip-basic-seed',
  pointSize: 'strip-basic-point-size',
} as const;

/** Strip Chart 进阶示例的中文属性面板 */
export const stripBasicControls = definePreviewControls({
  presentation: 'panel',
  title: '离散散布',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '大麦试验产量',
          rows: stripVegaBarleyData,
          columns: [{ key: 'site' }, { key: 'variety' }, { key: 'year' }, { key: 'yield' }],
        },
      ],
    },
    {
      label: '位置映射',
      controls: [
        {
          kind: 'select',
          id: STRIP_BASIC_CONTROL_IDS.discreteRole,
          label: '离散角色',
          defaultValue: 'x',
          options: [
            { value: 'x', label: 'x（极坐标角度）' },
            { value: 'y', label: 'y（极坐标半径）' },
          ],
        },
        {
          kind: 'select',
          id: STRIP_BASIC_CONTROL_IDS.discreteScale,
          label: '离散 scale',
          defaultValue: 'point',
          options: [
            { value: 'point', label: 'Point' },
            { value: 'band', label: 'Band' },
          ],
        },
        createPointCoordinateControl({
          id: STRIP_BASIC_CONTROL_IDS.coordinateSystem,
          label: '坐标系',
          cartesianLabel: '笛卡尔',
          polarLabel: '极坐标',
        }),
      ],
    },
    {
      label: '散布与点',
      controls: [
        {
          kind: 'range',
          id: STRIP_BASIC_CONTROL_IDS.jitterSpan,
          label: '散布宽度',
          defaultValue: 0.3,
          min: 0,
          max: 1,
          step: 0.05,
          help: '离散刻度间距的 0–1 比例；表示总散布宽度',
        },
        {
          kind: 'range',
          id: STRIP_BASIC_CONTROL_IDS.seed,
          label: '随机种子',
          defaultValue: 0,
          min: 0,
          max: 50,
          step: 1,
        },
        {
          kind: 'range',
          id: STRIP_BASIC_CONTROL_IDS.pointSize,
          label: '点半径',
          defaultValue: 5,
          min: 2,
          max: 10,
          step: 1,
        },
      ],
    },
  ],
});

/** Strip Chart 进阶示例的稳定文档契约 */
export const previewControlContract = {
  controls: stripBasicControls,
  canonicalValues: {
    [STRIP_BASIC_CONTROL_IDS.discreteRole]: 'x',
    [STRIP_BASIC_CONTROL_IDS.discreteScale]: 'point',
    [STRIP_BASIC_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [STRIP_BASIC_CONTROL_IDS.jitterSpan]: 0.3,
    [STRIP_BASIC_CONTROL_IDS.seed]: 0,
    [STRIP_BASIC_CONTROL_IDS.pointSize]: 5,
  },
  relatedApis: [
    'StripEncodings.x',
    'StripEncodings.y',
    'StripChart.coordinate',
    'StripProperties.jitter',
    'StripProperties.size',
  ],
} satisfies PreviewControlContract;

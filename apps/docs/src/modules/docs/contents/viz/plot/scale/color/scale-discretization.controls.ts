import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { discretizationValues } from './scale-discretization.data';

/** 离散化颜色比例尺 playground 的中文属性面板 */
export const scaleDiscretizationControls = definePreviewControls({
  presentation: 'panel',
  title: '离散化颜色比例尺',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'values',
          label: '偏斜连续值',
          rows: discretizationValues,
          columns: [{ key: 'x' }, { key: 'y' }, { key: 'value' }],
        },
      ],
    },
    {
      label: '分档规则',
      controls: [
        {
          kind: 'select',
          id: 'scaleType',
          label: '比例尺类型',
          defaultValue: 'quantize',
          options: [
            { value: 'quantize', label: '等宽分档 quantize' },
            { value: 'threshold', label: '业务阈值 threshold' },
            { value: 'quantile', label: '等频分档 quantile' },
          ],
        },
        {
          kind: 'range',
          id: 'count',
          label: '颜色档数',
          defaultValue: 4,
          min: 3,
          max: 7,
          step: 1,
          visibleWhen: { controlId: 'scaleType', oneOf: ['quantize', 'quantile'] },
        },
        {
          kind: 'select',
          id: 'thresholdPreset',
          label: '业务阈值',
          defaultValue: 'risk',
          options: [
            { value: 'risk', label: '风险等级 10 / 30 / 60' },
            { value: 'service', label: '服务等级 20 / 50 / 80' },
          ],
          visibleWhen: { controlId: 'scaleType', oneOf: ['threshold'] },
        },
        {
          kind: 'select',
          id: 'scheme',
          label: '分档配色',
          defaultValue: 'blues',
          options: [
            { value: 'blues', label: '蓝色 Blues' },
            { value: 'greens', label: '绿色 Greens' },
            { value: 'magma', label: 'Magma' },
          ],
        },
      ],
    },
  ],
});

/** 离散化颜色比例尺 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: scaleDiscretizationControls,
  canonicalValues: {
    scaleType: 'quantize',
    count: 4,
    thresholdPreset: 'risk',
    scheme: 'blues',
  },
  presets: [
    {
      id: 'quantize',
      label: '等宽四档',
      values: {
        scaleType: 'quantize',
        count: 4,
        thresholdPreset: 'risk',
        scheme: 'blues',
      },
    },
    {
      id: 'threshold',
      label: '业务阈值',
      values: {
        scaleType: 'threshold',
        count: 4,
        thresholdPreset: 'risk',
        scheme: 'blues',
      },
    },
    {
      id: 'quantile',
      label: '等频四档',
      values: {
        scaleType: 'quantile',
        count: 4,
        thresholdPreset: 'risk',
        scheme: 'blues',
      },
    },
  ],
  relatedApis: ['IRPlotQuantizeColorScale', 'IRPlotThresholdColorScale', 'IRPlotQuantileColorScale'],
} satisfies PreviewControlContract;

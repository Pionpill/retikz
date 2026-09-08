import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { polarJitterPoints } from './point-jitter.data';

/** 极坐标位置散布 playground 的稳定控件 id */
export const POINT_JITTER_POLAR_CONTROL_IDS = {
  scale: 'point-jitter-polar-scale',
  ratio: 'point-jitter-polar-ratio',
  range: 'point-jitter-polar-range',
  distribution: 'point-jitter-polar-distribution',
  sigma: 'point-jitter-polar-sigma',
  seed: 'point-jitter-polar-seed',
} as const;

/** 根据角度类型和实时控件值创建 x role jitter operation */
export const polarJitterOperationOf = (values: {
  [POINT_JITTER_POLAR_CONTROL_IDS.scale]: 'discrete' | 'continuous';
  [POINT_JITTER_POLAR_CONTROL_IDS.ratio]: number;
  [POINT_JITTER_POLAR_CONTROL_IDS.range]: number;
  [POINT_JITTER_POLAR_CONTROL_IDS.distribution]: 'uniform' | 'normal';
  [POINT_JITTER_POLAR_CONTROL_IDS.sigma]: number;
  [POINT_JITTER_POLAR_CONTROL_IDS.seed]: number;
}) => ({
  kind: 'jitter' as const,
  role: 'x',
  span:
    values[POINT_JITTER_POLAR_CONTROL_IDS.scale] === 'discrete'
      ? { kind: 'ratio' as const, value: values[POINT_JITTER_POLAR_CONTROL_IDS.ratio] }
      : values[POINT_JITTER_POLAR_CONTROL_IDS.range],
  distribution:
    values[POINT_JITTER_POLAR_CONTROL_IDS.distribution] === 'normal'
      ? { kind: 'normal' as const, sigma: values[POINT_JITTER_POLAR_CONTROL_IDS.sigma] }
      : { kind: 'uniform' as const },
  seed: values[POINT_JITTER_POLAR_CONTROL_IDS.seed],
});

/** 极坐标位置散布的中文属性面板 */
export const pointJitterPolarControls = definePreviewControls({
  presentation: 'panel',
  title: '极坐标散布',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'polarJitterPoints', label: '散点数据', rows: polarJitterPoints }],
    },
    {
      label: '角度比例尺',
      controls: [
        {
          kind: 'select',
          id: POINT_JITTER_POLAR_CONTROL_IDS.scale,
          label: '角度类型',
          defaultValue: 'discrete',
          options: [
            { value: 'discrete', label: '离散分类' },
            { value: 'continuous', label: '连续数值' },
          ],
        },
        {
          kind: 'range',
          id: POINT_JITTER_POLAR_CONTROL_IDS.ratio,
          label: '散布宽度',
          defaultValue: 0.3,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: POINT_JITTER_POLAR_CONTROL_IDS.scale, oneOf: ['discrete'] },
        },
        {
          kind: 'range',
          id: POINT_JITTER_POLAR_CONTROL_IDS.range,
          label: '散布宽度',
          defaultValue: 48,
          min: 0,
          max: 90,
          step: 2,
          visibleWhen: { controlId: POINT_JITTER_POLAR_CONTROL_IDS.scale, oneOf: ['continuous'] },
        },
        {
          kind: 'select',
          id: POINT_JITTER_POLAR_CONTROL_IDS.distribution,
          label: '随机分布',
          defaultValue: 'uniform',
          options: [
            { value: 'uniform', label: '均匀（铺开）' },
            { value: 'normal', label: '正态（靠近中心）' },
          ],
        },
        {
          kind: 'range',
          id: POINT_JITTER_POLAR_CONTROL_IDS.sigma,
          label: '正态 sigma',
          defaultValue: 0.5,
          min: 0.1,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: POINT_JITTER_POLAR_CONTROL_IDS.distribution, oneOf: ['normal'] },
        },
        {
          kind: 'range',
          id: POINT_JITTER_POLAR_CONTROL_IDS.seed,
          label: '随机种子',
          defaultValue: 7,
          min: 0,
          max: 100,
          step: 1,
        },
      ],
    },
  ],
});

/** 极坐标位置散布的稳定文档契约 */
export const previewControlContract = {
  controls: pointJitterPolarControls,
  canonicalValues: {
    [POINT_JITTER_POLAR_CONTROL_IDS.scale]: 'discrete',
    [POINT_JITTER_POLAR_CONTROL_IDS.ratio]: 0.3,
    [POINT_JITTER_POLAR_CONTROL_IDS.range]: 48,
    [POINT_JITTER_POLAR_CONTROL_IDS.distribution]: 'uniform',
    [POINT_JITTER_POLAR_CONTROL_IDS.sigma]: 0.5,
    [POINT_JITTER_POLAR_CONTROL_IDS.seed]: 7,
  },
  relatedApis: ['PlotScale.type', 'IRPlotJitterPositionAdjustment.span', 'IRPlotJitterPositionAdjustment.distribution'],
} satisfies PreviewControlContract;

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { jitterPoints } from './point-jitter.data';

/** 直角坐标位置散布 playground 的稳定控件 id */
export const POINT_JITTER_CARTESIAN_CONTROL_IDS = {
  spanKind: 'point-jitter-cartesian-span-kind',
  ratio: 'point-jitter-cartesian-ratio',
  range: 'point-jitter-cartesian-range',
  distribution: 'point-jitter-cartesian-distribution',
  sigma: 'point-jitter-cartesian-sigma',
  seed: 'point-jitter-cartesian-seed',
} as const;

/** 根据实时控件值创建 x role jitter operation */
export const cartesianJitterOperationOf = (values: {
  [POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind]: 'ratio' | 'range';
  [POINT_JITTER_CARTESIAN_CONTROL_IDS.ratio]: number;
  [POINT_JITTER_CARTESIAN_CONTROL_IDS.range]: number;
  [POINT_JITTER_CARTESIAN_CONTROL_IDS.distribution]: 'uniform' | 'normal';
  [POINT_JITTER_CARTESIAN_CONTROL_IDS.sigma]: number;
  [POINT_JITTER_CARTESIAN_CONTROL_IDS.seed]: number;
}) => ({
  kind: 'jitter' as const,
  role: 'x',
  span:
    values[POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind] === 'ratio'
      ? { kind: 'ratio' as const, value: values[POINT_JITTER_CARTESIAN_CONTROL_IDS.ratio] }
      : values[POINT_JITTER_CARTESIAN_CONTROL_IDS.range],
  distribution:
    values[POINT_JITTER_CARTESIAN_CONTROL_IDS.distribution] === 'normal'
      ? { kind: 'normal' as const, sigma: values[POINT_JITTER_CARTESIAN_CONTROL_IDS.sigma] }
      : { kind: 'uniform' as const },
  seed: values[POINT_JITTER_CARTESIAN_CONTROL_IDS.seed],
});

/** 直角坐标位置散布的中文属性面板 */
export const pointJitterCartesianControls = definePreviewControls({
  presentation: 'panel',
  title: '直角坐标散布',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'jitterPoints', label: '散点数据', rows: jitterPoints }],
    },
    {
      label: 'jitter 参数',
      controls: [
        {
          kind: 'select',
          id: POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind,
          label: '宽度单位',
          defaultValue: 'ratio',
          options: [
            { value: 'ratio', label: '刻度间距比例' },
            { value: 'range', label: '输出单位' },
          ],
        },
        {
          kind: 'range',
          id: POINT_JITTER_CARTESIAN_CONTROL_IDS.ratio,
          label: '散布宽度',
          defaultValue: 0.3,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind, oneOf: ['ratio'] },
        },
        {
          kind: 'range',
          id: POINT_JITTER_CARTESIAN_CONTROL_IDS.range,
          label: '散布宽度',
          defaultValue: 80,
          min: 0,
          max: 120,
          step: 5,
          visibleWhen: { controlId: POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind, oneOf: ['range'] },
        },
        {
          kind: 'select',
          id: POINT_JITTER_CARTESIAN_CONTROL_IDS.distribution,
          label: '随机分布',
          defaultValue: 'uniform',
          options: [
            { value: 'uniform', label: '均匀（铺开）' },
            { value: 'normal', label: '正态（靠近中心）' },
          ],
        },
        {
          kind: 'range',
          id: POINT_JITTER_CARTESIAN_CONTROL_IDS.sigma,
          label: '正态 sigma',
          defaultValue: 0.5,
          min: 0.1,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: POINT_JITTER_CARTESIAN_CONTROL_IDS.distribution, oneOf: ['normal'] },
        },
        {
          kind: 'range',
          id: POINT_JITTER_CARTESIAN_CONTROL_IDS.seed,
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

/** 直角坐标位置散布的稳定文档契约 */
export const previewControlContract = {
  controls: pointJitterCartesianControls,
  canonicalValues: {
    [POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind]: 'ratio',
    [POINT_JITTER_CARTESIAN_CONTROL_IDS.ratio]: 0.3,
    [POINT_JITTER_CARTESIAN_CONTROL_IDS.range]: 80,
    [POINT_JITTER_CARTESIAN_CONTROL_IDS.distribution]: 'uniform',
    [POINT_JITTER_CARTESIAN_CONTROL_IDS.sigma]: 0.5,
    [POINT_JITTER_CARTESIAN_CONTROL_IDS.seed]: 7,
  },
  presets: [
    {
      id: 'compact',
      label: '轻微散布',
      values: {
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind]: 'ratio',
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.ratio]: 0.35,
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.range]: 80,
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.distribution]: 'uniform',
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.sigma]: 0.5,
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.seed]: 7,
      },
    },
    {
      id: 'full-step',
      label: '完整刻度间距',
      values: {
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.spanKind]: 'ratio',
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.ratio]: 1,
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.range]: 80,
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.distribution]: 'uniform',
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.sigma]: 0.5,
        [POINT_JITTER_CARTESIAN_CONTROL_IDS.seed]: 7,
      },
    },
  ],
  relatedApis: [
    'IRPlotJitterPositionAdjustment.span',
    'IRPlotJitterPositionAdjustment.distribution',
    'IRPlotJitterPositionAdjustment.seed',
  ],
} satisfies PreviewControlContract;

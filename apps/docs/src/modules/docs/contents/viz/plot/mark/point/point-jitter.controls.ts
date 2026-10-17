import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { jitterPoints } from './point-jitter.data';
import { pointJitterI18n } from './point-jitter.i18n';

/** 位置抖动 playground 的稳定控件 id */
export const POINT_JITTER_CONTROL_IDS = {
  coordinate: 'point-jitter-coordinate',
  spanKind: 'point-jitter-span-kind',
  ratio: 'point-jitter-ratio',
  range: 'point-jitter-range',
  distribution: 'point-jitter-distribution',
  sigma: 'point-jitter-sigma',
  seed: 'point-jitter-seed',
} as const;

/** 根据实时控件值创建 x role jitter operation */
export const jitterOperationOf = (values: {
  [POINT_JITTER_CONTROL_IDS.spanKind]: 'ratio' | 'range';
  [POINT_JITTER_CONTROL_IDS.ratio]: number;
  [POINT_JITTER_CONTROL_IDS.range]: number;
  [POINT_JITTER_CONTROL_IDS.distribution]: 'uniform' | 'normal';
  [POINT_JITTER_CONTROL_IDS.sigma]: number;
  [POINT_JITTER_CONTROL_IDS.seed]: number;
}) => ({
  kind: 'jitter' as const,
  role: 'x',
  span:
    values[POINT_JITTER_CONTROL_IDS.spanKind] === 'ratio'
      ? { kind: 'ratio' as const, value: values[POINT_JITTER_CONTROL_IDS.ratio] }
      : values[POINT_JITTER_CONTROL_IDS.range],
  distribution:
    values[POINT_JITTER_CONTROL_IDS.distribution] === 'normal'
      ? { kind: 'normal' as const, sigma: values[POINT_JITTER_CONTROL_IDS.sigma] }
      : { kind: 'uniform' as const },
  seed: values[POINT_JITTER_CONTROL_IDS.seed],
});

/** 位置抖动的中文属性面板 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = pointJitterI18n[lang];
  const pointJitterControls = definePreviewControls({
    presentation: 'panel',
    title: i18n.jitter,
    sections: [
      {
        label: i18n.data,
        defaultCollapsed: true,
        controls: [{ kind: 'table', id: 'jitterPoints', label: i18n.pointRows, rows: jitterPoints }],
      },
      {
        label: i18n.jitterParameters,
        controls: [
          {
            kind: 'select',
            id: POINT_JITTER_CONTROL_IDS.coordinate,
            label: i18n.coordinate,
            defaultValue: 'cartesian2D',
            options: [
              { value: 'cartesian2D', label: i18n.cartesian },
              { value: 'polar2D', label: i18n.polar },
            ],
          },
          {
            kind: 'select',
            id: POINT_JITTER_CONTROL_IDS.spanKind,
            label: i18n.widthUnit,
            defaultValue: 'ratio',
            options: [
              { value: 'ratio', label: i18n.stepRatio },
              { value: 'range', label: i18n.outputUnits },
            ],
          },
          {
            kind: 'range',
            id: POINT_JITTER_CONTROL_IDS.ratio,
            label: i18n.spreadWidth,
            defaultValue: 0.3,
            min: 0,
            max: 1,
            step: 0.05,
            visibleWhen: { controlId: POINT_JITTER_CONTROL_IDS.spanKind, oneOf: ['ratio'] },
          },
          {
            kind: 'range',
            id: POINT_JITTER_CONTROL_IDS.range,
            label: i18n.spreadWidth,
            defaultValue: 80,
            min: 0,
            max: 120,
            step: 5,
            visibleWhen: { controlId: POINT_JITTER_CONTROL_IDS.spanKind, oneOf: ['range'] },
          },
          {
            kind: 'select',
            id: POINT_JITTER_CONTROL_IDS.distribution,
            label: i18n.randomDistribution,
            defaultValue: 'uniform',
            options: [
              { value: 'uniform', label: i18n.uniformEven },
              { value: 'normal', label: i18n.normalCentered },
            ],
          },
          {
            kind: 'range',
            id: POINT_JITTER_CONTROL_IDS.sigma,
            label: i18n.normalSigma,
            defaultValue: 0.5,
            min: 0.1,
            max: 1,
            step: 0.05,
            visibleWhen: { controlId: POINT_JITTER_CONTROL_IDS.distribution, oneOf: ['normal'] },
          },
          {
            kind: 'range',
            id: POINT_JITTER_CONTROL_IDS.seed,
            label: i18n.randomSeed,
            defaultValue: 7,
            min: 0,
            max: 100,
            step: 1,
          },
        ],
      },
    ],
  });

  /** 位置抖动的稳定文档契约 */
  return {
    controls: pointJitterControls,
    canonicalValues: {
      [POINT_JITTER_CONTROL_IDS.coordinate]: 'cartesian2D',
      [POINT_JITTER_CONTROL_IDS.spanKind]: 'ratio',
      [POINT_JITTER_CONTROL_IDS.ratio]: 0.3,
      [POINT_JITTER_CONTROL_IDS.range]: 80,
      [POINT_JITTER_CONTROL_IDS.distribution]: 'uniform',
      [POINT_JITTER_CONTROL_IDS.sigma]: 0.5,
      [POINT_JITTER_CONTROL_IDS.seed]: 7,
    },
    presetSelector: { label: i18n.preset, customLabel: i18n.custom },
    presets: [
      {
        id: 'compact',
        label: i18n.compactSpread,
        values: {
          [POINT_JITTER_CONTROL_IDS.coordinate]: 'cartesian2D',
          [POINT_JITTER_CONTROL_IDS.spanKind]: 'ratio',
          [POINT_JITTER_CONTROL_IDS.ratio]: 0.35,
          [POINT_JITTER_CONTROL_IDS.range]: 80,
          [POINT_JITTER_CONTROL_IDS.distribution]: 'uniform',
          [POINT_JITTER_CONTROL_IDS.sigma]: 0.5,
          [POINT_JITTER_CONTROL_IDS.seed]: 7,
        },
      },
      {
        id: 'full-step',
        label: i18n.fullStep,
        values: {
          [POINT_JITTER_CONTROL_IDS.coordinate]: 'cartesian2D',
          [POINT_JITTER_CONTROL_IDS.spanKind]: 'ratio',
          [POINT_JITTER_CONTROL_IDS.ratio]: 1,
          [POINT_JITTER_CONTROL_IDS.range]: 80,
          [POINT_JITTER_CONTROL_IDS.distribution]: 'uniform',
          [POINT_JITTER_CONTROL_IDS.sigma]: 0.5,
          [POINT_JITTER_CONTROL_IDS.seed]: 7,
        },
      },
    ],
    relatedApis: [
      'IRPlotJitterPositionAdjustment.span',
      'IRPlotJitterPositionAdjustment.distribution',
      'IRPlotJitterPositionAdjustment.seed',
    ],
  } satisfies PreviewControlContract;
};

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract();

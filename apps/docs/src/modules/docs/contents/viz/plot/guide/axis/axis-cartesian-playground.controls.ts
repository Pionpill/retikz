import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { axisCartesianPlaygroundRows } from './axis-cartesian-playground.data';
import { controlLabels } from './axis-cartesian-playground.i18n';

/** 笛卡尔坐标轴综合示例的中文控件 */
const createControls = (lang: Lang) => {
  const text = controlLabels[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: text.cartesianAxisPlayground,
    sections: [
      {
        label: text.data,
        defaultCollapsed: true,
        controls: [
          {
            kind: 'table',
            id: 'rows',
            label: text.sharedSamples,
            rows: axisCartesianPlaygroundRows,
            columns: [{ key: 'category' }, { key: 'x' }, { key: 'y' }],
          },
        ],
      },
      {
        label: text.scene,
        controls: [
          {
            kind: 'select',
            id: 'scene',
            label: text.axisScene,
            defaultValue: 'continuous-edge',
            options: [
              { value: 'continuous-edge', label: text.continuousEdge },
              { value: 'continuous-origin', label: text.continuousOrigin },
              { value: 'categorical', label: text.categoricalLabels },
            ],
          },
        ],
      },
      {
        label: text.candidateTicks,
        visibleWhen: { controlId: 'scene', oneOf: ['continuous-edge', 'continuous-origin'] },
        controls: [
          {
            kind: 'select',
            id: 'intervalStep',
            label: text.fixedInterval,
            defaultValue: '10',
            options: [
              { value: '5', label: text.value5 },
              { value: '10', label: text.value10 },
              { value: '20', label: text.value20 },
            ],
          },
          { kind: 'range', id: 'maxCount', label: text.maximumShown, defaultValue: 7, min: 2, max: 12, step: 1 },
        ],
      },
      {
        label: text.grid,
        visibleWhen: { controlId: 'scene', oneOf: ['continuous-edge', 'continuous-origin'] },
        controls: [
          {
            kind: 'select',
            id: 'gridStep',
            label: text.majorGridInterval,
            defaultValue: '10',
            options: [
              { value: '5', label: text.value52 },
              { value: '10', label: text.value102 },
              { value: '20', label: text.value202 },
            ],
          },

          { kind: 'switch', id: 'includeDomain', label: text.includeDomainEndpoints, defaultValue: false },
          { kind: 'switch', id: 'showMinor', label: text.showMinorGrid, defaultValue: true },
        ],
      },
      {
        label: text.categoryLabels,
        visibleWhen: { controlId: 'scene', oneOf: ['categorical'] },
        controls: [
          {
            kind: 'select',
            id: 'rotation',
            label: text.rotation,
            defaultValue: 'auto',
            options: [
              { value: 'auto', label: text.automatic },
              { value: '0', label: text.value0 },
              { value: '-45', label: text.value45 },
              { value: '-90', label: text.value90 },
            ],
          },
          {
            kind: 'select',
            id: 'hideStrategy',
            label: text.overlapHandling,
            defaultValue: 'none',
            options: [
              { value: 'none', label: text.keepAll },
              { value: 'greedy', label: text.greedyHiding },
              { value: 'parity', label: text.parityHiding },
            ],
          },
          {
            kind: 'select',
            id: 'overflow',
            label: text.boundaryOverflow,
            defaultValue: 'flush',
            options: [
              { value: 'allow', label: text.allow },
              { value: 'hide', label: text.hide },
              { value: 'flush', label: text.flushInward },
            ],
          },
        ],
      },
      {
        label: text.originAndEndpoints,
        visibleWhen: { controlId: 'scene', oneOf: ['continuous-origin'] },
        controls: [
          {
            kind: 'select',
            id: 'crossingLabel',
            label: text.originLabel,
            defaultValue: 'corner',
            options: [
              { value: 'show', label: text.showBesideAxis },
              { value: 'hide', label: text.hide2 },
              { value: 'corner', label: text.moveToCorner },
            ],
          },
          {
            kind: 'select',
            id: 'corner',
            label: text.corner,
            defaultValue: 'bottom-left',
            visibleWhen: { controlId: 'crossingLabel', oneOf: ['corner'] },
            options: [
              { value: 'top-left', label: text.topLeft },
              { value: 'top-right', label: text.topRight },
              { value: 'bottom-left', label: text.bottomLeft },
              { value: 'bottom-right', label: text.bottomRight },
            ],
          },
          { kind: 'switch', id: 'showArrow', label: text.showPositiveArrow, defaultValue: true },
          {
            kind: 'range',
            id: 'endpointDistance',
            label: text.tickAvoidanceDistance,
            defaultValue: 12,
            min: 0,
            max: 24,
            step: 2,
            visibleWhen: { controlId: 'showArrow', oneOf: [true] },
          },
        ],
      },
    ],
  });
};

/** 笛卡尔坐标轴综合示例的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: {
      scene: 'continuous-edge',
      intervalStep: '10',
      maxCount: 7,
      gridStep: '10',
      includeDomain: false,
      showMinor: true,
      rotation: 'auto',
      hideStrategy: 'none',
      overflow: 'flush',
      crossingLabel: 'corner',
      corner: 'bottom-left',
      showArrow: true,
      endpointDistance: 12,
    },
    relatedApis: [
      'PlotAxis.ticks.interval',
      'PlotAxis.ticks.density',
      'PlotAxis.grid',
      'PlotAxis.grid.includeDomain',
      'PlotAxis.grid.minor',
      'PlotAxis.tickLabels.layout',
      'PlotAxis.placement',
      'PlotAxis.crossing',
      'PlotAxis.line.arrow',
      'PlotAxis.ticks.endpoint',
    ],
  }) satisfies PreviewControlContract;

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { continuousValues } from './scale-continuous.data';

/** 连续位置比例尺 playground 的英文属性面板 */
export const scaleContinuousControls = definePreviewControls({
  presentation: 'panel',
  title: 'Continuous positional scale',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'values',
          label: 'Observations',
          rows: continuousValues,
          columns: [{ key: 'period' }, { key: 'positive' }, { key: 'signed' }],
        },
      ],
    },
    {
      label: 'Mapping',
      controls: [
        {
          kind: 'select',
          id: 'scaleType',
          label: 'Scale type',
          defaultValue: 'linear',
          options: [
            { value: 'linear', label: 'Linear' },
            { value: 'log', label: 'Logarithmic' },
            { value: 'sqrt', label: 'Square root' },
            { value: 'symlog', label: 'Symmetric log' },
          ],
        },
        {
          kind: 'select',
          id: 'dataVariant',
          label: 'Data series',
          defaultValue: 'positive',
          options: [
            { value: 'positive', label: 'Positive magnitudes' },
            { value: 'signed', label: 'Zero-crossing values' },
          ],
          visibleWhen: { controlId: 'scaleType', oneOf: ['linear', 'symlog'] },
        },
        {
          kind: 'range',
          id: 'base',
          label: 'Log base',
          defaultValue: 10,
          min: 2,
          max: 16,
          step: 1,
          visibleWhen: { controlId: 'scaleType', oneOf: ['log'] },
        },
        {
          kind: 'range',
          id: 'constant',
          label: 'Linear-region width',
          defaultValue: 1,
          min: 1,
          max: 100,
          step: 1,
          visibleWhen: { controlId: 'scaleType', oneOf: ['symlog'] },
        },
        {
          kind: 'range',
          id: 'domainPadding',
          label: 'Domain padding',
          defaultValue: 0,
          min: 0,
          max: 0.2,
          step: 0.01,
        },
      ],
    },
  ],
});

/** 连续位置比例尺 playground 的英文稳定文档契约 */
export const previewControlContract = {
  controls: scaleContinuousControls,
  canonicalValues: {
    scaleType: 'linear',
    dataVariant: 'positive',
    base: 10,
    constant: 1,
    domainPadding: 0,
  },
  presets: [
    {
      id: 'linear',
      label: 'Linear baseline',
      values: {
        scaleType: 'linear',
        dataVariant: 'positive',
        base: 10,
        constant: 1,
        domainPadding: 0,
      },
    },
    {
      id: 'log',
      label: 'Orders of magnitude',
      values: {
        scaleType: 'log',
        dataVariant: 'positive',
        base: 10,
        constant: 1,
        domainPadding: 0,
      },
    },
    {
      id: 'sqrt',
      label: 'Area aware',
      values: {
        scaleType: 'sqrt',
        dataVariant: 'positive',
        base: 10,
        constant: 1,
        domainPadding: 0,
      },
    },
    {
      id: 'symlog',
      label: 'Cross zero',
      values: {
        scaleType: 'symlog',
        dataVariant: 'signed',
        base: 10,
        constant: 1,
        domainPadding: 0,
      },
    },
  ],
  relatedApis: ['PlotScale.type', 'PlotScale.base', 'PlotScale.constant', 'PlotScale.domainPadding'],
} satisfies PreviewControlContract;

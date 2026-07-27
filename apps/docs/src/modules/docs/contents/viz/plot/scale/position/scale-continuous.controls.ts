import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { continuousValues } from './scale-continuous.data';

/** 连续位置比例尺 playground 的中文属性面板 */
export const scaleContinuousControls = definePreviewControls({
  presentation: 'panel',
  title: '连续位置比例尺',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'values',
          label: '观测值',
          rows: continuousValues,
          columns: [
            { key: 'period', label: '期数' },
            { key: 'positive', label: '正值' },
            { key: 'signed', label: '跨零值' },
          ],
        },
      ],
    },
    {
      label: '映射',
      controls: [
        {
          kind: 'select',
          id: 'scaleType',
          label: '比例尺类型',
          defaultValue: 'linear',
          options: [
            { value: 'linear', label: '线性 linear' },
            { value: 'log', label: '对数 log' },
            { value: 'sqrt', label: '平方根 sqrt' },
            { value: 'symlog', label: '对称对数 symlog' },
          ],
        },
        {
          kind: 'select',
          id: 'dataVariant',
          label: '数据序列',
          defaultValue: 'positive',
          options: [
            { value: 'positive', label: '跨数量级正值' },
            { value: 'signed', label: '跨零值' },
          ],
          visibleWhen: { controlId: 'scaleType', oneOf: ['linear', 'symlog'] },
        },
        {
          kind: 'range',
          id: 'base',
          label: '对数底数',
          defaultValue: 10,
          min: 2,
          max: 16,
          step: 1,
          visibleWhen: { controlId: 'scaleType', oneOf: ['log'] },
        },
        {
          kind: 'range',
          id: 'constant',
          label: '线性区宽度',
          defaultValue: 1,
          min: 1,
          max: 100,
          step: 1,
          visibleWhen: { controlId: 'scaleType', oneOf: ['symlog'] },
        },
        {
          kind: 'range',
          id: 'domainPadding',
          label: '值域留白',
          defaultValue: 0.05,
          min: 0,
          max: 0.2,
          step: 0.01,
        },
      ],
    },
  ],
});

/** 连续位置比例尺 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: scaleContinuousControls,
  canonicalValues: {
    scaleType: 'linear',
    dataVariant: 'positive',
    base: 10,
    constant: 1,
    domainPadding: 0.05,
  },
  presets: [
    {
      id: 'linear',
      label: '线性基准',
      values: {
        scaleType: 'linear',
        dataVariant: 'positive',
        base: 10,
        constant: 1,
        domainPadding: 0.05,
      },
    },
    {
      id: 'log',
      label: '跨数量级',
      values: {
        scaleType: 'log',
        dataVariant: 'positive',
        base: 10,
        constant: 1,
        domainPadding: 0.05,
      },
    },
    {
      id: 'sqrt',
      label: '面积感知',
      values: {
        scaleType: 'sqrt',
        dataVariant: 'positive',
        base: 10,
        constant: 1,
        domainPadding: 0.05,
      },
    },
    {
      id: 'symlog',
      label: '跨零数据',
      values: {
        scaleType: 'symlog',
        dataVariant: 'signed',
        base: 10,
        constant: 1,
        domainPadding: 0.05,
      },
    },
  ],
  relatedApis: ['Scale.type', 'Scale.base', 'Scale.constant', 'Scale.domainPadding'],
} satisfies PreviewControlContract;

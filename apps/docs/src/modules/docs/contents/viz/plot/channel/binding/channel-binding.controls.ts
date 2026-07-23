import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { cities } from './channel-binding.data';

/** 通道绑定 playground 的中文属性面板 */
export const channelBindingControls = definePreviewControls({
  presentation: 'panel',
  title: '通道绑定',
  sections: [
    {
      label: '数据',
      controls: [
        {
          kind: 'table',
          id: 'cities',
          label: '城市',
          rows: cities,
          columns: [
            { key: 'city' },
            { key: 'abbr' },
            { key: 'region' },
            { key: 'gdp' },
            { key: 'life' },
            { key: 'population' },
          ],
        },
      ],
    },
    {
      label: '位置通道',
      controls: [
        {
          kind: 'select',
          id: 'xField',
          label: 'x',
          defaultValue: 'gdp',
          options: [
            { value: 'gdp', label: 'gdp' },
            { value: 'life', label: 'life' },
            { value: 'population', label: 'population' },
          ],
        },
        {
          kind: 'select',
          id: 'yField',
          label: 'y',
          defaultValue: 'life',
          options: [
            { value: 'life', label: 'life' },
            { value: 'gdp', label: 'gdp' },
            { value: 'population', label: 'population' },
          ],
        },
      ],
    },
    {
      label: '样式与文本',
      controls: [
        {
          kind: 'select',
          id: 'colorSource',
          label: 'color',
          defaultValue: 'field',
          options: [
            { value: 'field', label: '字段 region' },
            { value: 'constant', label: '常量蓝色' },
          ],
        },
        {
          kind: 'select',
          id: 'sizeSource',
          label: 'size',
          defaultValue: 'field',
          options: [
            { value: 'field', label: '字段 population' },
            { value: 'constant', label: '常量 12' },
          ],
        },
        {
          kind: 'select',
          id: 'shapeSource',
          label: 'shape',
          defaultValue: 'field',
          options: [
            { value: 'field', label: '字段 region' },
            { value: 'constant', label: '常量圆形' },
          ],
        },
        { kind: 'switch', id: 'showLabel', label: '显示 abbr 标签', defaultValue: true },
      ],
    },
  ],
});

/** 通道绑定 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: channelBindingControls,
  canonicalValues: {
    xField: 'gdp',
    yField: 'life',
    colorSource: 'field',
    sizeSource: 'field',
    shapeSource: 'field',
    showLabel: true,
  },
  presets: [
    {
      id: 'fields',
      label: '字段驱动',
      values: {
        xField: 'gdp',
        yField: 'life',
        colorSource: 'field',
        sizeSource: 'field',
        shapeSource: 'field',
        showLabel: true,
      },
    },
    {
      id: 'constants',
      label: '固定样式',
      values: {
        xField: 'gdp',
        yField: 'life',
        colorSource: 'constant',
        sizeSource: 'constant',
        shapeSource: 'constant',
        showLabel: false,
      },
    },
  ],
  relatedApis: [
    'PointMark.x',
    'PointMark.y',
    'PointMark.color',
    'PointMark.size',
    'PointMark.shape',
    'PointMark.label',
  ],
} satisfies PreviewControlContract;

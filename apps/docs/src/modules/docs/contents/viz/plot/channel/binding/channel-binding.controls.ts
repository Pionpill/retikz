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
          label: '横轴字段',
          defaultValue: 'gdp',
          options: [
            { value: 'gdp', label: 'GDP' },
            { value: 'life', label: '预期寿命' },
            { value: 'population', label: '人口' },
          ],
        },
        {
          kind: 'select',
          id: 'yField',
          label: '纵轴字段',
          defaultValue: 'life',
          options: [
            { value: 'life', label: '预期寿命' },
            { value: 'gdp', label: 'GDP' },
            { value: 'population', label: '人口' },
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
          label: '颜色来源',
          defaultValue: 'field',
          options: [
            { value: 'field', label: '地区字段' },
            { value: 'constant', label: '固定蓝色' },
          ],
        },
        {
          kind: 'select',
          id: 'sizeSource',
          label: '大小来源',
          defaultValue: 'field',
          options: [
            { value: 'field', label: '人口字段' },
            { value: 'constant', label: '固定 12' },
          ],
        },
        {
          kind: 'select',
          id: 'shapeSource',
          label: '形状来源',
          defaultValue: 'field',
          options: [
            { value: 'field', label: '地区字段' },
            { value: 'constant', label: '固定圆形' },
          ],
        },
        { kind: 'switch', id: 'showLabel', label: '显示城市缩写', defaultValue: true },
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

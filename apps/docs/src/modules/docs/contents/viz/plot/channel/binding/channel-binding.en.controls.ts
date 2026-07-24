import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { cities } from './channel-binding.data';

/** English control panel for the channel-binding playground */
export const channelBindingControls = definePreviewControls({
  presentation: 'panel',
  title: 'Channel bindings',
  sections: [
    {
      label: 'Data',
      controls: [
        {
          kind: 'table',
          id: 'cities',
          label: 'Cities',
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
      label: 'Position channels',
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
      label: 'Style and text',
      controls: [
        {
          kind: 'select',
          id: 'colorSource',
          label: 'color',
          defaultValue: 'field',
          options: [
            { value: 'field', label: 'Field: region' },
            { value: 'constant', label: 'Constant blue' },
          ],
        },
        {
          kind: 'select',
          id: 'sizeSource',
          label: 'size',
          defaultValue: 'field',
          options: [
            { value: 'field', label: 'Field: population' },
            { value: 'constant', label: 'Constant 12' },
          ],
        },
        {
          kind: 'select',
          id: 'shapeSource',
          label: 'shape',
          defaultValue: 'field',
          options: [
            { value: 'field', label: 'Field: region' },
            { value: 'constant', label: 'Constant circle' },
          ],
        },
        { kind: 'switch', id: 'showLabel', label: 'Show abbr labels', defaultValue: true },
      ],
    },
  ],
});

/** Stable documentation contract for the channel-binding playground */
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
      label: 'Field driven',
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
      label: 'Fixed style',
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

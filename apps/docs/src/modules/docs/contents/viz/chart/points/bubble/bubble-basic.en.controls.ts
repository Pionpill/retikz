import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { BUBBLE_BASIC_CONTROL_IDS } from './bubble-basic.controls';
import { GAPMINDER_BUBBLE_YEAR, gapminderBubbleData } from './bubble-basic.data';

/** English controls for the basic Bubble showcase */
export const bubbleBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Basic bubble chart',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: `${GAPMINDER_BUBBLE_YEAR} country cross-section`,
          rows: gapminderBubbleData,
          columns: [
            { key: 'country', label: 'Country or territory' },
            { key: 'continent', label: 'Continent' },
            { key: 'gdpPerCapita', label: 'GDP per capita' },
            { key: 'lifeExpectancy', label: 'Life expectancy' },
            { key: 'population', label: 'Population' },
          ],
        },
      ],
    },
    {
      label: 'Bubble',
      controls: [
        {
          kind: 'switch',
          id: BUBBLE_BASIC_CONTROL_IDS.pointFillEnabled,
          label: 'Fill',
          defaultValue: false,
        },
        {
          kind: 'color',
          id: BUBBLE_BASIC_CONTROL_IDS.pointFill,
          label: 'Fill color',
          defaultValue: 'currentColor',
          visibleWhen: { controlId: BUBBLE_BASIC_CONTROL_IDS.pointFillEnabled, oneOf: [true] },
        },
        {
          kind: 'switch',
          id: BUBBLE_BASIC_CONTROL_IDS.pointStrokeEnabled,
          label: 'Stroke',
          defaultValue: false,
        },
        {
          kind: 'color',
          id: BUBBLE_BASIC_CONTROL_IDS.pointStroke,
          label: 'Stroke color',
          defaultValue: 'currentColor',
          visibleWhen: { controlId: BUBBLE_BASIC_CONTROL_IDS.pointStrokeEnabled, oneOf: [true] },
        },
        {
          kind: 'select',
          id: BUBBLE_BASIC_CONTROL_IDS.pointShape,
          label: 'Shape',
          defaultValue: 'circle',
          options: [
            { value: 'circle', label: 'Circle' },
            { value: 'rectangle', label: 'Rectangle' },
            { value: 'ellipse', label: 'Ellipse' },
            { value: 'diamond', label: 'Diamond' },
          ],
        },
        {
          kind: 'range',
          id: BUBBLE_BASIC_CONTROL_IDS.pointFillOpacity,
          label: 'Fill opacity',
          defaultValue: 0.7,
          min: 0.3,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the basic Bubble showcase */
export const previewControlContract = {
  controls: bubbleBasicControls,
  canonicalValues: {
    [BUBBLE_BASIC_CONTROL_IDS.pointFillEnabled]: false,
    [BUBBLE_BASIC_CONTROL_IDS.pointFill]: 'currentColor',
    [BUBBLE_BASIC_CONTROL_IDS.pointStrokeEnabled]: false,
    [BUBBLE_BASIC_CONTROL_IDS.pointStroke]: 'currentColor',
    [BUBBLE_BASIC_CONTROL_IDS.pointShape]: 'circle',
    [BUBBLE_BASIC_CONTROL_IDS.pointFillOpacity]: 0.7,
  },
  relatedApis: [
    'BubbleEncodings.x',
    'BubbleEncodings.y',
    'BubbleEncodings.size',
    'BubbleProperties.fill',
    'BubbleProperties.stroke',
    'BubbleProperties.shape',
    'BubbleProperties.fillOpacity',
  ],
} satisfies PreviewControlContract;

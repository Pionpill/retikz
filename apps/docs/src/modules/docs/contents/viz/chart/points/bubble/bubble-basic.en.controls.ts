import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateControl } from '../point-coordinate-control';
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
      label: 'Coordinate',
      controls: [
        createPointCoordinateControl({
          id: BUBBLE_BASIC_CONTROL_IDS.coordinateSystem,
          label: 'Coordinate system',
          cartesianLabel: 'Cartesian',
          polarLabel: 'Polar',
        }),
      ],
    },
    {
      label: 'Encodings',
      controls: [
        {
          kind: 'switch',
          id: BUBBLE_BASIC_CONTROL_IDS.colorByContinent,
          label: 'Color by continent',
          defaultValue: true,
        },
        {
          kind: 'select',
          id: BUBBLE_BASIC_CONTROL_IDS.xScale,
          label: 'X-axis scale',
          defaultValue: 'log',
          options: [
            { value: 'log', label: 'Logarithmic' },
            { value: 'linear', label: 'Linear' },
          ],
        },
      ],
    },
    {
      label: 'Bubble',
      controls: [
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
    [BUBBLE_BASIC_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [BUBBLE_BASIC_CONTROL_IDS.colorByContinent]: true,
    [BUBBLE_BASIC_CONTROL_IDS.xScale]: 'log',
    [BUBBLE_BASIC_CONTROL_IDS.pointStrokeEnabled]: false,
    [BUBBLE_BASIC_CONTROL_IDS.pointStroke]: 'currentColor',
    [BUBBLE_BASIC_CONTROL_IDS.pointShape]: 'circle',
    [BUBBLE_BASIC_CONTROL_IDS.pointFillOpacity]: 0.7,
  },
  relatedApis: [
    'BubbleChart.coordinate',
    'BubbleEncodings.x',
    'BubbleEncodings.y',
    'BubbleEncodings.size',
    'BubbleEncodings.color',
    'BubbleProperties.stroke',
    'BubbleProperties.shape',
    'BubbleProperties.fillOpacity',
  ],
} satisfies PreviewControlContract;

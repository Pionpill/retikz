import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { revenue } from './bar-basic.data';

/** Stable control ids for the basic bar playground */
export const BAR_POSITION_CONTROL_IDS = {
  coordinate: 'interval-basic-coordinate',
  direction: 'bar-position-direction',
  gap: 'bar-position-gap',
  cornerRadius: 'bar-position-corner-radius',
  fillOpacity: 'bar-position-fill-opacity',
  strokeWidth: 'bar-position-stroke-width',
  showLabels: 'bar-position-show-labels',
  shadow: 'bar-position-shadow',
} as const;

/** English panel for basic bars */
export const barPositionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Basic intervals',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'revenue', label: 'Quarterly revenue', rows: revenue }],
    },
    {
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: BAR_POSITION_CONTROL_IDS.coordinate,
          label: 'Projection',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: 'Cartesian' },
            { value: 'polar2D', label: 'Polar' },
          ],
        },
      ],
    },
    {
      label: 'Layout',
      controls: [
        {
          kind: 'select',
          id: BAR_POSITION_CONTROL_IDS.direction,
          label: 'Direction',
          defaultValue: 'vertical',
          visibleWhen: { controlId: BAR_POSITION_CONTROL_IDS.coordinate, oneOf: ['cartesian2D'] },
          options: [
            { value: 'vertical', label: 'Vertical' },
            { value: 'horizontal', label: 'Horizontal' },
          ],
        },
        {
          kind: 'range',
          id: BAR_POSITION_CONTROL_IDS.gap,
          label: 'Band gap',
          defaultValue: 0,
          min: 0,
          max: 0.8,
          step: 0.05,
        },
      ],
    },
    {
      label: 'Appearance',
      controls: [
        {
          kind: 'range',
          id: BAR_POSITION_CONTROL_IDS.cornerRadius,
          label: 'Corner radius',
          defaultValue: 6,
          min: 0,
          max: 20,
          step: 1,
        },
        {
          kind: 'range',
          id: BAR_POSITION_CONTROL_IDS.fillOpacity,
          label: 'Fill opacity',
          defaultValue: 0.9,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: BAR_POSITION_CONTROL_IDS.strokeWidth,
          label: 'Stroke width',
          defaultValue: 1,
          min: 0,
          max: 4,
          step: 0.5,
        },
        { kind: 'switch', id: BAR_POSITION_CONTROL_IDS.showLabels, label: 'Show labels', defaultValue: true },
        { kind: 'switch', id: BAR_POSITION_CONTROL_IDS.shadow, label: 'Show shadow', defaultValue: false },
      ],
    },
  ],
});

/** Stable documentation contract for basic bars */
export const previewControlContract = {
  controls: barPositionControls,
  canonicalValues: {
    [BAR_POSITION_CONTROL_IDS.coordinate]: 'cartesian2D',
    [BAR_POSITION_CONTROL_IDS.direction]: 'vertical',
    [BAR_POSITION_CONTROL_IDS.gap]: 0,
    [BAR_POSITION_CONTROL_IDS.cornerRadius]: 6,
    [BAR_POSITION_CONTROL_IDS.fillOpacity]: 0.9,
    [BAR_POSITION_CONTROL_IDS.strokeWidth]: 1,
    [BAR_POSITION_CONTROL_IDS.showLabels]: true,
    [BAR_POSITION_CONTROL_IDS.shadow]: false,
  },
  relatedApis: [
    'Plot.coordinate',
    'IntervalMark.x',
    'IntervalMark.y',
    'IntervalMark.direction',
    'Scale.paddingInner',
    'Scale.paddingOuter',
    'IntervalMark.cornerRadius',
    'IntervalMark.fillOpacity',
    'IntervalMark.strokeWidth',
    'IntervalMark.label',
    'IntervalMark.shadow',
  ],
} satisfies PreviewControlContract;

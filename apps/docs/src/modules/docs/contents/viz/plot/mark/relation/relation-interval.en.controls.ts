import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { intervalRelations } from './relation-interval.data';

/** Stable control ids for the interval-relation playground */
export const RELATION_INTERVAL_CONTROL_IDS = {
  offset: 'relation-interval-offset',
  strokeWidth: 'relation-interval-stroke-width',
  lineStyle: 'relation-interval-line-style',
  labelPosition: 'relation-interval-label-position',
  labelSide: 'relation-interval-label-side',
  labelSloped: 'relation-interval-label-sloped',
  barLabelPosition: 'relation-interval-bar-label-position',
  barLabelColor: 'relation-interval-bar-label-color',
} as const;

/** English panel for interval-relation routing */
export const relationIntervalControls = definePreviewControls({
  presentation: 'panel',
  title: 'Interval relations',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'intervalRelations', label: 'Interval relations', rows: intervalRelations }],
    },
    {
      label: 'Relation style',
      controls: [
        {
          kind: 'range',
          id: RELATION_INTERVAL_CONTROL_IDS.offset,
          label: 'Y offset',
          defaultValue: 0,
          min: -40,
          max: 40,
          step: 10,
        },
        {
          kind: 'range',
          id: RELATION_INTERVAL_CONTROL_IDS.strokeWidth,
          label: 'Line width',
          defaultValue: 1.1,
          min: 0.5,
          max: 4,
          step: 0.1,
        },
        {
          kind: 'select',
          id: RELATION_INTERVAL_CONTROL_IDS.lineStyle,
          label: 'Line style',
          defaultValue: 'dashed',
          options: [
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
          ],
        },
      ],
    },
    {
      label: 'Relation label',
      controls: [
        {
          kind: 'range',
          id: RELATION_INTERVAL_CONTROL_IDS.labelPosition,
          label: 'Path position',
          defaultValue: 0.5,
          min: 0.1,
          max: 0.9,
          step: 0.05,
        },
        {
          kind: 'select',
          id: RELATION_INTERVAL_CONTROL_IDS.labelSide,
          label: 'Relative to path',
          defaultValue: 'top',
          options: [
            { value: 'center', label: 'Centered' },
            { value: 'top', label: 'Above (default)' },
            { value: 'bottom', label: 'Below' },
          ],
        },
        {
          kind: 'switch',
          id: RELATION_INTERVAL_CONTROL_IDS.labelSloped,
          label: 'Follow path slope',
          defaultValue: true,
        },
      ],
    },
    {
      label: 'Interval labels',
      controls: [
        {
          kind: 'select',
          id: RELATION_INTERVAL_CONTROL_IDS.barLabelPosition,
          label: 'Label position',
          defaultValue: 'top',
          options: [
            { value: 'center', label: 'Center' },
            { value: 'top', label: 'Top' },
            { value: 'right', label: 'Right' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
          ],
        },
        {
          kind: 'color',
          id: RELATION_INTERVAL_CONTROL_IDS.barLabelColor,
          label: 'Label color',
          defaultValue: '#0f172a',
        },
      ],
    },
  ],
});

/** Stable documentation contract for the interval-relation playground */
export const previewControlContract = {
  controls: relationIntervalControls,
  canonicalValues: {
    [RELATION_INTERVAL_CONTROL_IDS.offset]: 0,
    [RELATION_INTERVAL_CONTROL_IDS.strokeWidth]: 1.1,
    [RELATION_INTERVAL_CONTROL_IDS.lineStyle]: 'dashed',
    [RELATION_INTERVAL_CONTROL_IDS.labelPosition]: 0.5,
    [RELATION_INTERVAL_CONTROL_IDS.labelSide]: 'top',
    [RELATION_INTERVAL_CONTROL_IDS.labelSloped]: true,
    [RELATION_INTERVAL_CONTROL_IDS.barLabelPosition]: 'top',
    [RELATION_INTERVAL_CONTROL_IDS.barLabelColor]: '#0f172a',
  },
  relatedApis: [
    'RelationMark.transform',
    'RelationMark.style',
    'RelationMark.path',
    'RelationMark.path.label.placement',
    'IntervalMark.labelPosition',
  ],
} satisfies PreviewControlContract;

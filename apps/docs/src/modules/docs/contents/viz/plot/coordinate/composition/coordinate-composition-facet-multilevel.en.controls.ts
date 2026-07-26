import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS } from './coordinate-composition-facet-multilevel.controls';
import { channelRows } from './coordinate-composition-facet-multilevel.data';

/** Multi-level facet demo controls in English */
export const coordinateCompositionFacetMultilevelControls = definePreviewControls({
  presentation: 'panel',
  title: 'Multi-level facets',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Channel metrics',
          rows: channelRows,
          columns: [
            { key: 'business', label: 'Business' },
            { key: 'metric', label: 'Metric' },
            { key: 'region', label: 'Region' },
            { key: 'channel', label: 'Channel' },
            { key: 'month', label: 'Month' },
            { key: 'value', label: 'Value' },
          ],
        },
      ],
    },
    {
      label: 'Hierarchy',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.rowHierarchy,
          label: 'Row hierarchy',
          defaultValue: 'business-metric',
          options: [
            { value: 'business-metric', label: 'Business → metric' },
            { value: 'metric-business', label: 'Metric → business' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.columnHierarchy,
          label: 'Column hierarchy',
          defaultValue: 'region-channel',
          options: [
            { value: 'region-channel', label: 'Region → channel' },
            { value: 'channel-region', label: 'Channel → region' },
          ],
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.rowHeaders,
          label: 'Show row headers',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.columnHeaders,
          label: 'Show column headers',
          defaultValue: true,
        },
      ],
    },
    {
      label: 'Layout',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.scale,
          label: 'Y-axis range',
          defaultValue: 'shared',
          options: [
            { value: 'shared', label: 'Shared' },
            { value: 'independent', label: 'Independent panels' },
          ],
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.panelGap,
          label: 'Panel gap',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 2,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.xGridVisible,
          label: 'Vertical grid (x-axis)',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.yGridVisible,
          label: 'Horizontal grid (y-axis)',
          defaultValue: true,
        },
      ],
    },
    {
      label: 'Layer style',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.lineWidth,
          label: 'Line width',
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.pointSize,
          label: 'Point size',
          defaultValue: 6,
          min: 3,
          max: 12,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the multi-level facet demo */
export const previewControlContract = {
  controls: coordinateCompositionFacetMultilevelControls,
  canonicalValues: {
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.rowHierarchy]: 'business-metric',
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.columnHierarchy]: 'region-channel',
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.rowHeaders]: true,
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.columnHeaders]: true,
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.scale]: 'shared',
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.panelGap]: 8,
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.xGridVisible]: true,
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.yGridVisible]: true,
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.lineWidth]: 2,
    [COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.pointSize]: 6,
  },
  relatedApis: [
    'Facet.row',
    'Facet.column',
    'Facet.header',
    'Facet.resolve',
    'Facet.spacing',
    'Axis.grid',
    'PathMark.strokeWidth',
    'PointMark.size',
  ],
} satisfies PreviewControlContract;

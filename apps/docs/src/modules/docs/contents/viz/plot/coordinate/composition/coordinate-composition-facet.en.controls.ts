import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { COORDINATE_COMPOSITION_FACET_CONTROL_IDS } from './coordinate-composition-facet.controls';
import { accountRows } from './coordinate-composition-facet.data';

/** English controls for the facet playground */
export const coordinateCompositionFacetControls = definePreviewControls({
  presentation: 'panel',
  title: 'Facet layout',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Product accounts',
          rows: accountRows,
          columns: [{ key: 'product' }, { key: 'tier' }, { key: 'month' }, { key: 'accounts' }],
        },
      ],
    },
    {
      label: 'Layout',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.layout,
          label: 'Arrangement',
          defaultValue: 'columns',
          options: [
            { value: 'columns', label: 'Columns' },
            { value: 'grid', label: 'Row-column grid' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.scale,
          label: 'Y-axis range',
          defaultValue: 'shared',
          options: [
            { value: 'shared', label: 'Shared' },
            { value: 'independent', label: 'Independent panels' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.empty,
          label: 'Empty combinations',
          defaultValue: 'drop',
          visibleWhen: { controlId: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.layout, oneOf: ['grid'] },
          options: [
            { value: 'drop', label: 'Hide' },
            { value: 'show', label: 'Keep' },
          ],
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.headers,
          label: 'Show facet headers',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.panelGap,
          label: 'Panel gap',
          defaultValue: 18,
          min: 0,
          max: 32,
          step: 2,
        },
      ],
    },
    {
      label: 'Axes',
      controls: [
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.xGridVisible,
          label: 'Vertical grid (x-axis)',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.yGridVisible,
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
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.lineWidth,
          label: 'Line width',
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_FACET_CONTROL_IDS.pointSize,
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

/** Stable documentation contract for the facet playground */
export const previewControlContract = {
  controls: coordinateCompositionFacetControls,
  canonicalValues: {
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.layout]: 'columns',
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.scale]: 'shared',
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.empty]: 'drop',
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.headers]: true,
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.panelGap]: 18,
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.xGridVisible]: true,
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.yGridVisible]: true,
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.lineWidth]: 2,
    [COORDINATE_COMPOSITION_FACET_CONTROL_IDS.pointSize]: 6,
  },
  presets: [
    {
      id: 'columns',
      label: 'Single-row facets',
      values: {
        layout: 'columns',
        scale: 'shared',
        empty: 'drop',
        headers: true,
        panelGap: 18,
        xGridVisible: true,
        yGridVisible: true,
        lineWidth: 2,
        pointSize: 6,
      },
    },
    {
      id: 'grid-shared',
      label: 'Shared-range grid',
      values: {
        layout: 'grid',
        scale: 'shared',
        empty: 'show',
        headers: true,
        panelGap: 18,
        xGridVisible: true,
        yGridVisible: true,
        lineWidth: 2,
        pointSize: 6,
      },
    },
    {
      id: 'grid-independent',
      label: 'Independent-range grid',
      values: {
        layout: 'grid',
        scale: 'independent',
        empty: 'show',
        headers: true,
        panelGap: 18,
        xGridVisible: true,
        yGridVisible: true,
        lineWidth: 2,
        pointSize: 6,
      },
    },
  ],
  relatedApis: [
    'Facet',
    'PlotFacet.resolve',
    'PlotFacet.empty',
    'PlotFacet.spacing',
    'PlotAxis.grid',
    'PathMark.strokeWidth',
    'PointMark.size',
  ],
} satisfies PreviewControlContract;

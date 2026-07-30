import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { sales } from './plot-lineage.data';

/** English controls for the Plot lineage example */
export const plotLineageControls = definePreviewControls({
  presentation: 'panel',
  title: 'Lineage',
  defaultSize: 25,
  sections: [
    {
      label: 'Input Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'rows', label: 'Sales rows', rows: sales }],
    },
    {
      label: 'Root Transform',
      controls: [
        {
          kind: 'switch',
          id: 'rootSortEnabled',
          label: 'Sort by revenue',
          defaultValue: false,
        },
        {
          kind: 'select',
          id: 'rootSortOrder',
          label: 'Sort order',
          defaultValue: 'descending',
          options: [
            { value: 'ascending', label: 'Ascending' },
            { value: 'descending', label: 'Descending' },
          ],
          visibleWhen: { controlId: 'rootSortEnabled', oneOf: [true] },
        },
      ],
    },
    {
      label: 'Mark-local Transform',
      controls: [
        {
          kind: 'switch',
          id: 'markSelectEnabled',
          label: 'Revenue Top-N',
          defaultValue: false,
        },
        {
          kind: 'range',
          id: 'markTopN',
          label: 'Rows to keep',
          defaultValue: 3,
          min: 1,
          max: sales.length,
          step: 1,
          visibleWhen: { controlId: 'markSelectEnabled', oneOf: [true] },
        },
      ],
    },
    {
      label: 'Recording Scope',
      controls: [
        { kind: 'switch', id: 'markIdentity', label: 'Mark identity', defaultValue: true },
        { kind: 'switch', id: 'markEncoding', label: 'Encoding fields', defaultValue: true },
        { kind: 'switch', id: 'scaleMappings', label: 'Scale mappings', defaultValue: false },
        { kind: 'switch', id: 'layoutContext', label: 'Layout context', defaultValue: false },
      ],
    },
  ],
});

/** Stable documentation contract for the Plot lineage example */
export const previewControlContract = {
  controls: plotLineageControls,
  canonicalValues: {
    markIdentity: true,
    markEncoding: true,
    scaleMappings: false,
    layoutContext: false,
    rootSortEnabled: false,
    rootSortOrder: 'descending',
    markSelectEnabled: false,
    markTopN: 3,
  },
  presets: [
    {
      id: 'minimal',
      label: 'Minimal skeleton',
      values: {
        markIdentity: false,
        markEncoding: false,
        scaleMappings: false,
        layoutContext: false,
        rootSortEnabled: false,
        rootSortOrder: 'descending',
        markSelectEnabled: false,
        markTopN: 3,
      },
    },
    {
      id: 'default',
      label: 'Default summary',
      values: {
        markIdentity: true,
        markEncoding: true,
        scaleMappings: false,
        layoutContext: false,
        rootSortEnabled: false,
        rootSortOrder: 'descending',
        markSelectEnabled: false,
        markTopN: 3,
      },
    },
    {
      id: 'transforms',
      label: 'Two-scope transforms',
      values: {
        markIdentity: true,
        markEncoding: true,
        scaleMappings: false,
        layoutContext: false,
        rootSortEnabled: true,
        rootSortOrder: 'descending',
        markSelectEnabled: true,
        markTopN: 3,
      },
    },
    {
      id: 'visual',
      label: 'Complete visual semantics',
      values: {
        markIdentity: true,
        markEncoding: true,
        scaleMappings: true,
        layoutContext: true,
        rootSortEnabled: false,
        rootSortOrder: 'descending',
        markSelectEnabled: false,
        markTopN: 3,
      },
    },
  ],
  relatedApis: [
    'PlotLineageOptions.markIdentity',
    'PlotLineageOptions.markEncoding',
    'PlotLineageOptions.scaleMappings',
    'PlotLineageOptions.layoutContext',
    'PlotProps.dataTransforms',
    'IRPlotMark.transform',
  ],
} satisfies PreviewControlContract;

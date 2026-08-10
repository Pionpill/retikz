import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createLayoutInspectionControls } from '../layout-inspection-controls';

/** GridLayout 辅助层的 family 英文开关 */
export const gridLayoutInspectionFamilyControls = [
  { id: 'inspectTracks', option: 'tracks', label: 'Track bounds', recommended: true },
  { id: 'inspectCells', option: 'cells', label: 'Cell bounds', recommended: false },
  { id: 'inspectGaps', option: 'gaps', label: 'Fixed gaps', recommended: true },
  {
    id: 'inspectDistributedSpace',
    option: 'distributedSpace',
    label: 'Distributed-space boundaries',
    recommended: false,
  },
  { id: 'inspectSpans', option: 'spans', label: 'Track-span markers', recommended: false },
] as const;

const inspectionControls = createLayoutInspectionControls({
  labels: {
    details: 'Inspection details',
    container: 'Container bounds',
    content: 'Content bounds',
    padding: 'Padding regions',
    slot: 'Slot bounds',
    margin: 'Margin regions',
    allocation: 'Allocation bounds',
    visual: 'Visual bounds',
    overflow: 'Overflow warnings',
    alignmentGuides: 'Alignment guides',
    labels: 'Text labels',
    preset: 'Inspection preset',
    custom: 'Custom',
    recommended: 'Recommended',
    all: 'All',
    off: 'Off',
  },
  familyControls: gridLayoutInspectionFamilyControls,
});

/** GridLayout 轨道分配的英文属性面板 */
export const gridLayoutPlaygroundEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'GridLayout parameters',
  sections: [
    ...inspectionControls.sections,
    {
      label: 'Tracks and auto placement',
      controls: [
        {
          kind: 'select',
          id: 'autoFlow',
          label: 'Auto-flow direction',
          defaultValue: 'row',
          options: [
            { value: 'row', label: 'Row' },
            { value: 'column', label: 'Column' },
          ],
        },
        { kind: 'range', id: 'fraction', label: 'Second-column share', defaultValue: 2, min: 1, max: 4, step: 1 },
        { kind: 'range', id: 'columnGap', label: 'Column gap', defaultValue: 8, min: 0, max: 24, step: 2 },
        { kind: 'range', id: 'rowGap', label: 'Row gap', defaultValue: 8, min: 0, max: 24, step: 2 },
      ],
    },
    {
      label: 'Cell alignment',
      controls: [
        {
          kind: 'select',
          id: 'justifyItems',
          label: 'Horizontal alignment',
          defaultValue: 'stretch',
          options: [
            { value: 'start', label: 'Start' },
            { value: 'center', label: 'Center' },
            { value: 'end', label: 'End' },
            { value: 'stretch', label: 'Stretch' },
          ],
        },
        {
          kind: 'select',
          id: 'alignItems',
          label: 'Vertical alignment',
          defaultValue: 'center',
          options: [
            { value: 'start', label: 'Start' },
            { value: 'center', label: 'Center' },
            { value: 'end', label: 'End' },
            { value: 'stretch', label: 'Stretch' },
          ],
        },
      ],
    },
  ],
});

/** 当前 GridLayout playground 的稳定英文文档契约 */
const canonicalValues = {
  ...inspectionControls.canonicalValues,
  autoFlow: 'row',
  fraction: 2,
  columnGap: 8,
  rowGap: 8,
  justifyItems: 'stretch',
  alignItems: 'center',
};

export const previewControlContract = {
  controls: gridLayoutPlaygroundEnControls,
  stateOnlyIds: inspectionControls.stateOnlyIds,
  canonicalValues,
  presets: inspectionControls.presetsFor(canonicalValues),
  presetSelector: inspectionControls.presetSelector,
  relatedApis: [
    'GridLayout.inspect',
    'GridLayout.autoFlow',
    'GridLayout.columns',
    'GridLayout.columnGap',
    'GridLayout.rowGap',
    'GridLayout.justifyItems',
    'GridLayout.alignItems',
  ],
} satisfies PreviewControlContract;

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createLayoutInspectionControls } from '../layout-inspection-controls';

/** FlexLayout 辅助层的 family 英文开关 */
export const flexLayoutInspectionFamilyControls = [
  { id: 'inspectLines', option: 'lines', label: 'Flex line regions', recommended: true },
  { id: 'inspectGaps', option: 'gaps', label: 'Fixed gaps', recommended: true },
  {
    id: 'inspectDistributedSpace',
    option: 'distributedSpace',
    label: 'Distributed-space boundaries',
    recommended: false,
  },
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
  familyControls: flexLayoutInspectionFamilyControls,
});

/** FlexLayout 关键分配行为的英文属性面板 */
export const flexLayoutPlaygroundEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'FlexLayout parameters',
  sections: [
    ...inspectionControls.sections,
    {
      label: 'Direction and wrapping',
      controls: [
        {
          kind: 'select',
          id: 'direction',
          label: 'Main direction',
          defaultValue: 'row',
          options: [
            { value: 'row', label: 'Row' },
            { value: 'row-reverse', label: 'Row reverse' },
            { value: 'column', label: 'Column' },
            { value: 'column-reverse', label: 'Column reverse' },
          ],
        },
        {
          kind: 'select',
          id: 'wrap',
          label: 'Wrapping',
          defaultValue: 'wrap',
          options: [
            { value: 'nowrap', label: 'No wrap' },
            { value: 'wrap', label: 'Wrap' },
            { value: 'wrap-reverse', label: 'Wrap reverse' },
          ],
        },
      ],
    },
    {
      label: 'Alignment and distribution',
      controls: [
        {
          kind: 'select',
          id: 'alignItems',
          label: 'Cross alignment',
          defaultValue: 'center',
          options: [
            { value: 'start', label: 'Start' },
            { value: 'center', label: 'Center' },
            { value: 'end', label: 'End' },
            { value: 'stretch', label: 'Stretch' },
          ],
        },
        { kind: 'range', id: 'basis', label: 'Base size', defaultValue: 92, min: 52, max: 150, step: 2 },
        { kind: 'range', id: 'grow', label: 'A grow', defaultValue: 1, min: 0, max: 4, step: 1 },
        { kind: 'range', id: 'shrink', label: 'B shrink', defaultValue: 1, min: 0, max: 4, step: 1 },
      ],
    },
  ],
});

/** 当前 FlexLayout playground 的稳定英文文档契约 */
const canonicalValues = {
  ...inspectionControls.canonicalValues,
  direction: 'row',
  wrap: 'wrap',
  alignItems: 'center',
  basis: 92,
  grow: 1,
  shrink: 1,
};

export const previewControlContract = {
  controls: flexLayoutPlaygroundEnControls,
  stateOnlyIds: inspectionControls.stateOnlyIds,
  canonicalValues,
  presets: inspectionControls.presetsFor(canonicalValues),
  presetSelector: inspectionControls.presetSelector,
  relatedApis: [
    'FlexLayout.inspect',
    'FlexLayout.direction',
    'FlexLayout.wrap',
    'FlexLayout.alignItems',
    'LayoutItem.basis',
    'LayoutItem.grow',
    'LayoutItem.shrink',
  ],
} satisfies PreviewControlContract;

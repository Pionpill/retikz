import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createLayoutInspectionControls } from '../layout-inspection-controls';

/** OverlayLayout 辅助层的 family 英文开关 */
export const overlayLayoutInspectionFamilyControls = [
  { id: 'inspectPlacements', option: 'placements', label: 'Placement relations', recommended: false },
  { id: 'inspectAnchors', option: 'anchors', label: 'Positioning anchors', recommended: false },
  { id: 'inspectStacking', option: 'stacking', label: 'Stacking order', recommended: false },
] as const;

const inspectionControls = createLayoutInspectionControls({
  labels: {
    details: 'Overlay details',
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
    preset: 'Overlay preset',
    custom: 'Custom',
    recommended: 'Recommended',
    all: 'All',
    off: 'Off',
  },
  familyControls: overlayLayoutInspectionFamilyControls,
});

/** OverlayLayout 局部定位的英文属性面板 */
export const overlayLayoutPlaygroundEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'OverlayLayout parameters',
  sections: [
    ...inspectionControls.sections,
    {
      label: 'Shared alignment',
      controls: [
        {
          kind: 'select',
          id: 'justifyItems',
          label: 'Horizontal alignment',
          defaultValue: 'center',
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
    {
      label: 'Badge positioning',
      controls: [
        { kind: 'range', id: 'badgeX', label: 'Target x', defaultValue: 300, min: 20, max: 320, step: 10 },
        { kind: 'range', id: 'badgeY', label: 'Target y', defaultValue: 18, min: 10, max: 130, step: 10 },
        {
          kind: 'select',
          id: 'anchor',
          label: 'Anchor',
          defaultValue: 'top-right',
          options: [
            { value: 'top-left', label: 'Top left' },
            { value: 'center', label: 'Center' },
            { value: 'top-right', label: 'Top right' },
          ],
        },
        { kind: 'range', id: 'zIndex', label: 'Stacking layer', defaultValue: 2, min: -1, max: 3, step: 1 },
      ],
    },
  ],
});

/** 当前 OverlayLayout playground 的稳定英文文档契约 */
const canonicalValues = {
  ...inspectionControls.canonicalValues,
  justifyItems: 'center',
  alignItems: 'center',
  badgeX: 300,
  badgeY: 18,
  anchor: 'top-right',
  zIndex: 2,
};

export const previewControlContract = {
  controls: overlayLayoutPlaygroundEnControls,
  stateOnlyIds: inspectionControls.stateOnlyIds,
  canonicalValues,
  presets: inspectionControls.presetsFor(canonicalValues),
  presetSelector: inspectionControls.presetSelector,
  relatedApis: [
    'OverlayLayout.inspect',
    'OverlayLayout.justifyItems',
    'OverlayLayout.alignItems',
    'LayoutItem.placement.at',
    'LayoutItem.placement.anchor',
    'LayoutItem.zIndex',
  ],
} satisfies PreviewControlContract;

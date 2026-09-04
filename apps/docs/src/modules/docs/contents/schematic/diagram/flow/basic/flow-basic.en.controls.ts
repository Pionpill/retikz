import { defineFlowBasicControlContract } from './flow-basic.controls';

/** Basic Flow demo English controls contract */
export const previewControlContract = defineFlowBasicControlContract({
  title: 'Form submission flow',
  formSection: 'Frontend form',
  formRoleLabel: 'Entity role',
  formRoleOptions: [
    { value: 'participant', label: 'Participant' },
    { value: 'activity', label: 'Activity' },
    { value: 'event', label: 'Event' },
    { value: 'state', label: 'State' },
    { value: 'gateway', label: 'Gateway' },
    { value: 'resource', label: 'Resource' },
    { value: 'concept', label: 'Concept' },
  ],
  formStatusLabel: 'Entity status',
  formStatusOptions: [
    { value: 'none', label: 'Unmarked' },
    { value: 'error', label: 'Error' },
    { value: 'success', label: 'Success' },
    { value: 'warning', label: 'Warning' },
    { value: 'disabled', label: 'Disabled' },
  ],
  formTextLabel: 'Text',
  formTextPlaceholder: 'Enter frontend form text; press Enter for a new line',
  formTextDefault: 'Frontend form',
  formSubtitleLabel: 'Subtitle',
  formSubtitlePlaceholder: 'Enter optional supporting text',
  formSubtitleDefault: 'Complete user details',
  formSubtitleSizeLabel: 'Subtitle size',
  formSubtitleSizeOptions: [
    { value: 'xs', label: 'Extra small (xs)' },
    { value: 'sm', label: 'Small (sm)' },
    { value: 'base', label: 'Base (base)' },
    { value: 'lg', label: 'Large (lg)' },
  ],
  formSubtitleColorLabel: 'Subtitle color',
  formTextAlignLabel: 'Text alignment',
  formTextAlignOptions: [
    { value: 'start', label: 'Start' },
    { value: 'middle', label: 'Middle' },
    { value: 'end', label: 'End' },
  ],
  formLineHeightLabel: 'Line height',
  formMaxTextWidthLabel: 'Maximum text width',
  relationSection: 'Connections',
  relationRoleLabel: 'Arrow type',
  relationRoleOptions: [
    { value: 'flow', label: 'Flow' },
    { value: 'association', label: 'Association' },
    { value: 'dependency', label: 'Dependency' },
    { value: 'generalization', label: 'Generalization' },
    { value: 'influence', label: 'Influence' },
  ],
  relationStatusLabel: 'Relation status',
  relationStatusOptions: [
    { value: 'none', label: 'Unmarked' },
    { value: 'error', label: 'Error' },
    { value: 'success', label: 'Success' },
    { value: 'warning', label: 'Warning' },
    { value: 'disabled', label: 'Disabled' },
  ],
});

/** Basic Flow demo English controls */
export const flowBasicControls = previewControlContract.controls;

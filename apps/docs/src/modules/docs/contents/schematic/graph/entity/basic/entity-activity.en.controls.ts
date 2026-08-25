import { defineEntityRoleControlContract } from './entity-role-controls';

/** English controls contract for the activity role */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity: Activity',
  sectionLabel: 'Appearance and text',
  colorLabel: 'Graph Theme primary color',
  contentLabel: 'Text',
  contentPlaceholder: 'Enter Entity text',
  content: 'Process Order',
});

/** English controls for the activity role */
export const entityActivityControls = previewControlContract.controls;

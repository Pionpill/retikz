import { defineEntityRoleControlContract } from './entity-role-controls';

/** English controls contract for the state role */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity: State',
  sectionLabel: 'Appearance and text',
  colorLabel: 'Graph Theme primary color',
  contentLabel: 'Text',
  contentPlaceholder: 'Enter Entity text',
  content: 'Pending',
});

/** English controls for the state role */
export const entityStateControls = previewControlContract.controls;

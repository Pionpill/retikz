import { defineEntityRoleControlContract } from './entity-role-controls';

/** English controls contract for the event role */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity: Event',
  sectionLabel: 'Appearance and text',
  statusLocale: 'en',
  colorLabel: 'Graph Theme primary color',
  contentLabel: 'Text',
  contentPlaceholder: 'Enter Entity text',
  content: 'Timeout',
});

/** English controls for the event role */
export const entityEventControls = previewControlContract.controls;

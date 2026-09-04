import { defineEntityRoleControlContract } from './entity-role-controls';

/** English controls contract for the resource role */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity: Resource',
  sectionLabel: 'Appearance and text',
  statusLocale: 'en',
  colorLabel: 'Graph Theme primary color',
  contentLabel: 'Text',
  contentPlaceholder: 'Enter Entity text',
  content: 'Order DB',
});

/** English controls for the resource role */
export const entityResourceControls = previewControlContract.controls;

import { defineEntityRoleControlContract } from './entity-role-controls';

/** English controls contract for the concept role */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity: Concept',
  sectionLabel: 'Appearance and text',
  statusLocale: 'en',
  colorLabel: 'Graph Theme primary color',
  contentLabel: 'Text',
  contentPlaceholder: 'Enter Entity text',
  content: 'Order',
});

/** English controls for the concept role */
export const entityConceptControls = previewControlContract.controls;

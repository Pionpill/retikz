import { defineEntityRoleControlContract } from './entity-role-controls';

/** English controls contract for the participant role */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity: Participant',
  sectionLabel: 'Appearance and text',
  colorLabel: 'Graph Theme primary color',
  contentLabel: 'Text',
  contentPlaceholder: 'Enter Entity text',
  content: 'Payment API',
});

/** English controls for the participant role */
export const entityParticipantControls = previewControlContract.controls;

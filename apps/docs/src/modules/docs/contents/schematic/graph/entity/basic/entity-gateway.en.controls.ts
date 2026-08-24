import { defineEntityRoleControlContract } from './entity-role-controls';

/** English controls contract for the gateway role */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity: Gateway',
  sectionLabel: 'Appearance and text',
  colorLabel: 'Graph Theme primary color',
  contentLabel: 'Text',
  contentPlaceholder: 'Enter Entity text',
  content: 'Stock?',
});

/** English controls for the gateway role */
export const entityGatewayControls = previewControlContract.controls;

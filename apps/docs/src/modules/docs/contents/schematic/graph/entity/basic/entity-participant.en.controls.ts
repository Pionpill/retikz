import { LogicFigureEntityKind } from '@/modules/docs/components/logic-figure';

import { defineEntityRoleControlContract } from './entity-role-controls';

/** English controls contract for the participant role */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity: Participant',
  sectionLabel: 'Appearance and text',
  statusLocale: 'en',
  colorLabel: 'Instance color',
  contentLabel: 'Text',
  contentPlaceholder: 'Enter Entity text',
  content: 'Payment API',
  kinds: [LogicFigureEntityKind.Important, LogicFigureEntityKind.Secondary],
});

/** English controls for the participant role */
export const entityParticipantControls = previewControlContract.controls;

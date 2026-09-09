import { LogicFigureEntityKind } from '@/modules/docs/components/logic-figure';

import { defineEntityRoleControlContract } from './entity-role-controls';

/** English controls contract for the event role */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity: Event',
  sectionLabel: 'Appearance and text',
  statusLocale: 'en',
  colorLabel: 'Instance color',
  contentLabel: 'Text',
  contentPlaceholder: 'Enter Entity text',
  content: 'Timeout',
  kinds: [LogicFigureEntityKind.ImportantData, LogicFigureEntityKind.Secondary],
});

/** English controls for the event role */
export const entityEventControls = previewControlContract.controls;

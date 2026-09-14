import { LogicFigureEntityKind } from '@/modules/docs/components/logic-figure';

import { defineEntityRoleControlContract } from './entity-role-controls';

/** English controls contract for the activity role */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity: Activity',
  sectionLabel: 'Appearance and text',
  statusLocale: 'en',
  colorLabel: 'Instance color',
  contentLabel: 'Text',
  contentPlaceholder: 'Enter Entity text',
  content: 'Process Order',
  kinds: [LogicFigureEntityKind.Important, LogicFigureEntityKind.Secondary, LogicFigureEntityKind.Algorithm],
});

/** English controls for the activity role */
export const entityActivityControls = previewControlContract.controls;

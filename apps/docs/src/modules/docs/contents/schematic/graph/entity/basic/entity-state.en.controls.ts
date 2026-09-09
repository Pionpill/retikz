import { LogicFigureEntityKind } from '@/modules/docs/components/logic-figure';

import { defineEntityRoleControlContract } from './entity-role-controls';

/** English controls contract for the state role */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity: State',
  sectionLabel: 'Appearance and text',
  statusLocale: 'en',
  colorLabel: 'Instance color',
  contentLabel: 'Text',
  contentPlaceholder: 'Enter Entity text',
  content: 'Pending',
  kinds: [LogicFigureEntityKind.ImportantData, LogicFigureEntityKind.Secondary],
});

/** English controls for the state role */
export const entityStateControls = previewControlContract.controls;

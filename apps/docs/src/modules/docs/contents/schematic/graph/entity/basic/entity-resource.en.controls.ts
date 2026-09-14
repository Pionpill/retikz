import { LogicFigureEntityKind } from '@/modules/docs/components/logic-figure';

import { defineEntityRoleControlContract } from './entity-role-controls';

/** English controls contract for the resource role */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity: Resource',
  sectionLabel: 'Appearance and text',
  statusLocale: 'en',
  colorLabel: 'Instance color',
  contentLabel: 'Text',
  contentPlaceholder: 'Enter Entity text',
  content: 'Order DB',
  kinds: [LogicFigureEntityKind.ImportantData, LogicFigureEntityKind.Secondary],
});

/** English controls for the resource role */
export const entityResourceControls = previewControlContract.controls;

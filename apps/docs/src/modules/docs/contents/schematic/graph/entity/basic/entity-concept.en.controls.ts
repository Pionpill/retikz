import { LogicFigureEntityKind } from '@/modules/docs/components/logic-figure';

import { defineEntityRoleControlContract } from './entity-role-controls';

/** English controls contract for the concept role */
export const previewControlContract = defineEntityRoleControlContract({
  title: 'Entity: Concept',
  sectionLabel: 'Appearance and text',
  statusLocale: 'en',
  colorLabel: 'Instance color',
  contentLabel: 'Text',
  contentPlaceholder: 'Enter Entity text',
  content: 'Order',
  kinds: [LogicFigureEntityKind.Important, LogicFigureEntityKind.Secondary],
});

/** English controls for the concept role */
export const entityConceptControls = previewControlContract.controls;

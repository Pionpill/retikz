import type { FC } from 'react';

import { EntityRole } from '@retikz/graph';
import { Entity } from '@retikz/graph-react';

import { LogicFigure } from '@/modules/docs/components/logic-figure';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { entityParticipantControls, previewControlContract } from './entity-participant.en.controls';
import { defineEntityAppearanceProps } from './entity-role-controls';

export const previewControls = entityParticipantControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <LogicFigure semanticColors={!values.status} viewBox={{ x: 0, y: 0, width: 360, height: 180 }}>
    <Entity
      role={EntityRole.Participant}
      kind={values.kind || undefined}
      status={values.status || undefined}
      {...defineEntityAppearanceProps(values.color)}
      position={[180, 90]}
    >
      {values.content}
    </Entity>
  </LogicFigure>
));

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** Precise color and text controls for the participant role */
const Demo: FC = controlledPreview.Component;

export default Demo;

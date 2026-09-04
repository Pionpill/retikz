import type { FC } from 'react';

import { Entity, Graph } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { entityParticipantControls, previewControlContract } from './entity-participant.controls';
import { defineEntityAppearanceProps } from './entity-role-controls';

export const previewControls = entityParticipantControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Graph width={360} height={180} viewBox={{ x: 0, y: 0, width: 360, height: 180 }}>
    <Entity
      role="participant"
      status={values.status || undefined}
      {...defineEntityAppearanceProps(values.color)}
      position={[180, 90]}
    >
      {values.content}
    </Entity>
  </Graph>
));

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** 参与主体 role 的视觉与文本 controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;

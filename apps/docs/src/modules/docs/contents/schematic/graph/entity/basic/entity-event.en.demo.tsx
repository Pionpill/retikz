import type { FC } from 'react';

import { Entity, Graph } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { entityEventControls, previewControlContract } from './entity-event.en.controls';
import { defineEntityAppearanceProps } from './entity-role-controls';

export const previewControls = entityEventControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Graph width={360} height={180} viewBox={{ x: 0, y: 0, width: 360, height: 180 }}>
    <Entity role="event" {...defineEntityAppearanceProps(values.color)} position={[180, 90]}>
      {values.content}
    </Entity>
  </Graph>
));

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** Precise color and text controls for the event role */
const Demo: FC = controlledPreview.Component;

export default Demo;

import type { FC } from 'react';

import { Entity } from '@retikz/graph-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { entityTerminalControls, previewControlContract } from './entity-terminal.en.controls';

export const previewControls = entityTerminalControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={360} height={180} viewBox={{ x: -140, y: -80, width: 280, height: 160 }}>
    <Entity id="terminal-demo" role="terminal" position={[0, 0]} color={values.color} variant={values.variant}>
      {values.content}
    </Entity>
  </Layout>
));

export const previewSource = controlledPreview.source;

/** terminal role playground */
const Demo: FC = controlledPreview.Component;

export default Demo;

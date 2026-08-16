import type { FC } from 'react';

import { Entity } from '@retikz/graph-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { entityPlaygroundControls, previewControlContract } from './entity-playground.en.controls';

export const previewControls = entityPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={360} height={180} viewBox={{ x: -140, y: -80, width: 280, height: 160 }}>
    <Entity
      id="entity-playground"
      role={values.role}
      variant={values.variant}
      position={[0, 0]}
      color={values.color}
      stroke={values.stroke}
      textColor={values.textColor}
    >
      {values.content}
    </Entity>
  </Layout>
));

export const previewSource = controlledPreview.source;

/** Entity playground */
const Demo: FC = controlledPreview.Component;

export default Demo;

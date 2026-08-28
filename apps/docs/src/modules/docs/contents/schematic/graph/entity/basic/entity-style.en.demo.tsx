import type { FC } from 'react';

import { Entity, Graph } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { entityStyleControls, previewControlContract } from './entity-style.en.controls';

export const previewControls = entityStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Graph width={360} height={180} viewBox={{ x: 0, y: 0, width: 360, height: 180 }}>
    <Entity
      id="entity-style"
      role={values.role}
      position={[180, 90]}
      fill={values.fill}
      stroke={values.stroke}
      strokeWidth={values.strokeWidth}
      dashed={values.dashed}
      opacity={values.opacity}
      textColor={values.textColor}
    >
      {values.content}
    </Entity>
  </Graph>
));

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** Entity role and Node style controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;

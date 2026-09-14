import { Entity } from '@retikz/graph-react';
import type { FC } from 'react';

import { LogicFigure } from '@/modules/docs/components/logic-figure';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { entityStyleControls, previewControlContract } from './entity-style.en.controls';

export const previewControls = entityStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <LogicFigure semanticColors={!values.status} viewBox={{ x: 0, y: 0, width: 360, height: 180 }}>
    <Entity
      id="entity-style"
      role="activity"
      kind={values.kind}
      status={values.status || undefined}
      position={[180, 90]}
      style={{
        ...(values.fill === 'currentColor' ? {} : { fill: values.fill }),
        ...(values.stroke === 'currentColor' ? {} : { stroke: values.stroke }),
        strokeWidth: values.strokeWidth,
        dashed: values.dashed,
        opacity: values.opacity,
        textColor: values.textColor,
      }}
    >
      {values.content}
    </Entity>
  </LogicFigure>
));

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** External Entity kind and Node style controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;

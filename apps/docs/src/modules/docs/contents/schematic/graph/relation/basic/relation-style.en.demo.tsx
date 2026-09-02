import type { FC } from 'react';

import { Entity, Graph, Relation } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { previewControlContract, relationStyleControls } from './relation-style.en.controls';

export const previewControls = relationStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const role = typeof values.role === 'string' ? values.role : 'flow';
  const content = typeof values.content === 'string' ? values.content : 'Next step';
  const sourceColor = typeof values.sourceColor === 'string' ? values.sourceColor : 'currentColor';
  const targetColor = typeof values.targetColor === 'string' ? values.targetColor : 'currentColor';
  const stroke = typeof values.stroke === 'string' ? values.stroke : '#2563eb';
  const strokeWidth = typeof values.strokeWidth === 'number' ? values.strokeWidth : 2;
  const opacity = typeof values.opacity === 'number' ? values.opacity : 1;
  const labelTextColor = typeof values.labelTextColor === 'string' ? values.labelTextColor : '#334155';
  const labelOpacity = typeof values.labelOpacity === 'number' ? values.labelOpacity : 1;

  return (
    <Graph width={460} height={220} viewBox={{ x: 0, y: 0, width: 460, height: 220 }}>
      <Entity
        id="source"
        role="participant"
        position={[90, 110]}
        {...(sourceColor === 'currentColor' ? {} : { color: sourceColor })}
      >
        Source
      </Entity>
      <Entity
        id="target"
        role="resource"
        position={[370, 110]}
        {...(targetColor === 'currentColor' ? {} : { color: targetColor })}
      >
        Target
      </Entity>
      <Relation
        id="relation-style"
        role={role}
        source={{ id: 'source' }}
        target={{ id: 'target' }}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
        {...(values.dashed === true ? { dashPattern: [6, 4] } : {})}
        sourceMarker={{ color: stroke, fill: stroke }}
        targetMarker={{ color: stroke, fill: stroke }}
        labelTextForeground={labelTextColor}
        labelOpacity={labelOpacity}
        labels={[{ text: content, position: 0.5 }]}
        way={['source', 'target']}
      />
    </Graph>
  );
});

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** Relation role and Path/label style controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;

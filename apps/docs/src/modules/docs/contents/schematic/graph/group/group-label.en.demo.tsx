import type { IRNodeLabel } from '@retikz/core';
import type { FC } from 'react';

import { Entity, Graph, Group, Relation } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { GroupLabelControlId } from './group-label.controls';
import { groupLabelControls, previewControlContract } from './group-label.en.controls';

export const previewControls = groupLabelControls;

/** Convert a position control value to a Core label position */
const positionOf = (value: unknown): IRNodeLabel['position'] => {
  if (value === 'top-left') return 'top-left';
  if (value === 'top-right') return 'top-right';
  if (value === 'bottom-left') return 'bottom-left';
  if (value === 'bottom-right') return 'bottom-right';
  if (value === 'top') return 'top';
  if (value === 'bottom') return 'bottom';
  if (value === 'left') return 'left';
  if (value === 'right') return 'right';
  return undefined;
};

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const primaryPosition = positionOf(values[GroupLabelControlId.PrimaryPosition]) ?? 'top-left';
  const secondaryPosition = positionOf(values[GroupLabelControlId.SecondaryPosition]) ?? 'bottom-right';
  const defaultPositionValue = values[GroupLabelControlId.DefaultPosition];
  const defaultLabelPosition =
    defaultPositionValue === 'default' ? {} : { position: positionOf(defaultPositionValue) ?? 'bottom-left' };

  return (
    <Graph width={360} height={190} viewBox={{ x: -52, y: -63, width: 360, height: 190 }}>
      <Group
        id="boundary"
        labels={[
          { text: 'top left', position: primaryPosition },
          { text: 'bottom right', position: secondaryPosition },
          { text: 'default bottom-left', ...defaultLabelPosition },
        ]}
      >
        <Entity id="input" role="resource" position={[90, 105]} textColor="currentColor">
          Input
        </Entity>
        <Entity id="output" role="resource" position={[270, 105]} textColor="currentColor">
          Output
        </Entity>
        <Relation role="flow" source={{ id: 'input' }} target={{ id: 'output' }} />
      </Group>
    </Graph>
  );
});

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** Group label-position controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;

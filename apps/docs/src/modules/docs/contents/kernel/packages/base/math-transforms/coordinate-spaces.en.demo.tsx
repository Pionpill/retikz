import type { CenteredShape, Position } from '@retikz/math';
import type { FC } from 'react';

import { localToWorld } from '@retikz/math';
import { Circle, Draw, Layout, Node } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinateSpacesControls, previewControlContract } from './coordinate-spaces.en.controls';

export const previewControls = coordinateSpacesControls;

type CoordinateSpacesValues = PreviewControlValuesFor<typeof coordinateSpacesControls>;

const localCorners: Array<Position> = [
  [-48, -30],
  [48, -30],
  [48, 30],
  [-48, 30],
];

const labelPositionFor = (point: Position): Position => [
  point[0] > 115 ? point[0] - 55 : point[0] + 26,
  point[1] < -65 ? point[1] + 20 : point[1] - 18,
];

const localLabelPositionFor = (shape: CenteredShape): Position => [shape.x - 46, shape.y + 52];

const controlledPreview = defineControlledPreview(previewControlContract, (values: CoordinateSpacesValues) => {
  const shape: CenteredShape = {
    x: values.centerX,
    y: values.centerY,
    rotate: (values.rotation * Math.PI) / 180,
  };
  const worldCorners = localCorners.map(point => localToWorld(shape, point));
  const worldPoint = localToWorld(shape, [values.localX, values.localY]);
  const localXAxis = [localToWorld(shape, [-60, 0]), localToWorld(shape, [60, 0])];
  const localYAxis = [localToWorld(shape, [0, -52]), localToWorld(shape, [0, 52])];

  return (
    <Layout width={400} height={280} viewBox={{ x: -170, y: -110, width: 340, height: 220 }}>
      <Draw
        way={[
          [-160, 0],
          [160, 0],
        ]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Draw
        way={[
          [0, -100],
          [0, 100],
        ]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Draw way={localXAxis} stroke="darkorange" dashPattern={[4, 3]} />
      <Draw way={localYAxis} stroke="darkorange" dashPattern={[4, 3]} />
      <Draw way={[...worldCorners, worldCorners[0]]} stroke="darkorange" strokeWidth={2} />
      <Draw way={[[shape.x, shape.y], worldPoint]} stroke="darkorange" strokeWidth={2} arrow="->" />
      <Circle center={[shape.x, shape.y]} radius={4} fill="darkorange" stroke="none" />
      <Circle center={worldPoint} radius={5} fill="dodgerblue" stroke="none" />
      <Node position={[-142, -88]} stroke="none" textColor="gray" font={{ size: 12 }}>
        World axes
      </Node>
      <Node position={labelPositionFor(worldPoint)} stroke="none" textColor="dodgerblue" font={{ size: 12 }}>
        World point
      </Node>
      <Node position={localLabelPositionFor(shape)} stroke="none" textColor="darkorange" font={{ size: 12 }}>
        Local point [{values.localX}, {values.localY}]
      </Node>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Observe coordinate transforms by controlling the shape center, rotation, and local point */
const Demo: FC = controlledPreview.Component;

export default Demo;

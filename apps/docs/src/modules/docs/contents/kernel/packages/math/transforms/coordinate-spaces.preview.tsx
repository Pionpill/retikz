import type { CenteredShape, Position } from '@retikz/math';
import { localToWorld } from '@retikz/math';
import { Draw, Layout, Node } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';

import type { Lang } from '@/i18n';

import { coordinateSpacesI18n } from './coordinate-spaces.i18n';

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

const renderCoordinateSpaces = (values: CoordinateSpacesPreviewValues, lang: Lang) => {
  const i18n = coordinateSpacesI18n[lang];
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
    <Layout>
      <Draw
        way={[
          [-160, 0],
          [160, 0],
        ]}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Draw
        way={[
          [0, -100],
          [0, 100],
        ]}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Draw way={localXAxis} style={{ stroke: 'darkorange', dashPattern: [4, 3] }} />
      <Draw way={localYAxis} style={{ stroke: 'darkorange', dashPattern: [4, 3] }} />
      <Draw way={[...worldCorners, worldCorners[0]]} style={{ stroke: 'darkorange', strokeWidth: 2 }} />
      <Draw way={[[shape.x, shape.y], worldPoint]} arrow="->" style={{ stroke: 'darkorange', strokeWidth: 2 }} />
      <Circle center={[shape.x, shape.y]} radius={4} style={{ fill: 'darkorange', stroke: 'none' }} />
      <Circle center={worldPoint} radius={5} style={{ fill: 'dodgerblue', stroke: 'none' }} />
      <Node position={[-142, -88]} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
        {i18n.worldAxes}
      </Node>
      <Node
        position={labelPositionFor(worldPoint)}
        style={{ stroke: 'none', textColor: 'dodgerblue', font: { size: 12 } }}
      >
        {i18n.worldPoint}
      </Node>
      <Node
        position={localLabelPositionFor(shape)}
        style={{ stroke: 'none', textColor: 'darkorange', font: { size: 12 } }}
      >
        {i18n.localPoint} [{values.localX}, {values.localY}]
      </Node>
    </Layout>
  );
};

/** 图形参数 */
export type CoordinateSpacesPreviewValues = {
  centerX: number;
  centerY: number;
  rotation: number;
  localX: number;
  localY: number;
};

/** 绘制示例图形 */
export const CoordinateSpacesPreview = (values: CoordinateSpacesPreviewValues, lang: Lang = 'zh') =>
  renderCoordinateSpaces(values, lang);

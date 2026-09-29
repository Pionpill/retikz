import type { Position } from '@retikz/math';
import { curve } from '@retikz/math';
import { Draw, Layout, Path, Step } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';

const PointSets = {
  uneven: [
    [-145, 55],
    [-105, -50],
    [-25, 15],
    [20, -65],
    [145, 45],
  ],
  zigzag: [
    [-145, 50],
    [-80, -55],
    [-10, 55],
    [60, -55],
    [145, 50],
  ],
  coincident: [
    [-145, 45],
    [-60, -45],
    [-60, -45],
    [35, 45],
    [145, -35],
  ],
} satisfies Record<CurvePlaygroundPreviewValues['pointSet'], Array<Position>>;

/** 图形参数 */
export type CurvePlaygroundPreviewValues = {
  pointSet: 'uneven' | 'zigzag' | 'coincident';
  controlPoint: [number, number];
  tension: number;
};

/** 绘制示例图形 */
export const CurvePlaygroundPreview = (values: CurvePlaygroundPreviewValues) => {
  const points = PointSets[values.pointSet].map((point, index) => (index === 2 ? values.controlPoint : point));
  const segments = curve.catmullRomToCubic(points, values.tension);

  return (
    <Layout>
      <Draw way={points} style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }} />
      <Path style={{ stroke: 'darkorange', strokeWidth: 2 }}>
        <Step kind="move" to={points[0]} />
        {segments.map((segment, index) => (
          <Step key={index} kind="cubic" to={segment.to} control1={segment.control1} control2={segment.control2} />
        ))}
      </Path>
      {points.map((point, index) => (
        <Circle
          key={`${point[0]}-${point[1]}-${index}`}
          center={point}
          radius={4}
          style={{ fill: index === 2 ? 'seagreen' : 'dodgerblue', stroke: 'none' }}
        />
      ))}
    </Layout>
  );
};

import type { WayDSL } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';

const CurveCenter: [number, number] = [100, 0];

const pointOnEllipse = (
  center: [number, number],
  radiusX: number,
  radiusY: number,
  angleDeg: number,
): [number, number] => {
  const angle = (angleDeg * Math.PI) / 180;
  return [center[0] + Math.cos(angle) * radiusX, center[1] + Math.sin(angle) * radiusY];
};

const wayOf = (values: DrawCurvePreviewValues): WayDSL => {
  switch (values.curveKind) {
    case 'curve':
      return ['A', { curve: values.control }, 'B'];
    case 'cubic':
      return [
        'A',
        {
          cubic: [values.control1, values.control2],
        },
        'B',
      ];
    case 'bend':
      return ['A', { bend: values.bendDirection, angle: values.bendAngle }, 'B'];
    case 'arc':
      return ['C', { arc: { startAngle: values.startAngle, endAngle: values.endAngle, radius: values.radius } }];
    case 'circle':
      return ['C', { circle: { radius: values.radius } }];
    case 'ellipse':
      return ['C', { ellipse: { radius: { x: values.radiusX, y: values.radiusY } } }];
  }
};

/** 图形参数 */
export type DrawCurvePreviewValues = {
  curveKind: 'curve' | 'cubic' | 'bend' | 'arc' | 'circle' | 'ellipse';
  control: [number, number];
  control1: [number, number];
  control2: [number, number];
  radius: number;
  startAngle: number;
  endAngle: number;
  radiusX: number;
  radiusY: number;
  bendDirection: 'left' | 'right';
  bendAngle: number;
};

/** 绘制示例图形 */
export const DrawCurvePreview = (values: DrawCurvePreviewValues) => {
  const usesEndpoints = values.curveKind === 'curve' || values.curveKind === 'cubic' || values.curveKind === 'bend';

  return (
    <Layout viewBox={{ x: -70, y: -130, width: 340, height: 260 }}>
      {usesEndpoints ? (
        <>
          <Node id="A" position={[0, 0]} style={{ stroke: 'gray', dashed: true }}>
            a
          </Node>
          <Node id="B" position={[200, 0]} style={{ stroke: 'gray', dashed: true }}>
            b
          </Node>
        </>
      ) : (
        <Node id="C" position={CurveCenter} style={{ stroke: 'none' }}>
          ·
        </Node>
      )}
      {values.curveKind === 'curve' && (
        <>
          <Draw way={['A', values.control]} style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }} />
          <Draw way={[values.control, 'B']} style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }} />
          <Circle center={values.control} radius={4} style={{ fill: 'white', stroke: 'gray' }} />
        </>
      )}
      {values.curveKind === 'cubic' && (
        <>
          <Draw way={['A', values.control1]} style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }} />
          <Draw way={[values.control2, 'B']} style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }} />
          <Circle center={values.control1} radius={4} style={{ fill: 'white', stroke: 'gray' }} />
          <Circle center={values.control2} radius={4} style={{ fill: 'white', stroke: 'gray' }} />
        </>
      )}
      {values.curveKind === 'bend' && (
        <Draw way={['A', 'B']} style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }} />
      )}
      {values.curveKind === 'arc' && (
        <>
          <Draw
            way={[CurveCenter, pointOnEllipse(CurveCenter, values.radius, values.radius, values.startAngle)]}
            style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
          />
          <Draw
            way={[CurveCenter, pointOnEllipse(CurveCenter, values.radius, values.radius, values.endAngle)]}
            style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
          />
        </>
      )}
      {values.curveKind === 'circle' && (
        <Draw
          way={[CurveCenter, pointOnEllipse(CurveCenter, values.radius, values.radius, 0)]}
          style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
        />
      )}
      {values.curveKind === 'ellipse' && (
        <>
          <Draw
            way={[CurveCenter, pointOnEllipse(CurveCenter, values.radiusX, values.radiusY, 0)]}
            style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
          />
          <Draw
            way={[CurveCenter, pointOnEllipse(CurveCenter, values.radiusX, values.radiusY, 90)]}
            style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
          />
        </>
      )}
      <Draw way={wayOf(values)} style={{ stroke: 'dodgerblue', strokeWidth: 2 }} />
    </Layout>
  );
};

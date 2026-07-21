import type { WayDSL } from '@retikz/core';
import type { FC } from 'react';

import { Circle, Draw, Layout, Node } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { drawCurveControls, previewControlContract } from './draw-curve.controls';

export const previewControls = drawCurveControls;

type DrawCurveValues = PreviewControlValuesFor<typeof drawCurveControls>;

const CurveCenter: [number, number] = [100, 0];

/** 按 core 的屏幕角度约定计算圆或椭圆上的点 */
const pointOnEllipse = (
  center: [number, number],
  radiusX: number,
  radiusY: number,
  angleDeg: number,
): [number, number] => {
  const angle = (angleDeg * Math.PI) / 180;
  return [center[0] + Math.cos(angle) * radiusX, center[1] + Math.sin(angle) * radiusY];
};

/** 把面板值转换为当前选中的 Draw way 曲线操作 */
const wayOf = (values: DrawCurveValues): WayDSL => {
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

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const usesEndpoints = values.curveKind === 'curve' || values.curveKind === 'cubic' || values.curveKind === 'bend';

  return (
    <Layout width={360} height={260} viewBox={{ x: -70, y: -130, width: 340, height: 260 }}>
      {usesEndpoints ? (
        <>
          <Node id="A" position={[0, 0]} stroke="gray" dashed>
            a
          </Node>
          <Node id="B" position={[200, 0]} stroke="gray" dashed>
            b
          </Node>
        </>
      ) : (
        <Node id="C" position={CurveCenter} stroke="none">
          ·
        </Node>
      )}
      {values.curveKind === 'curve' && (
        <>
          <Draw way={['A', values.control]} stroke="gray" dashPattern={[1, 4]} lineCap="round" />
          <Draw way={[values.control, 'B']} stroke="gray" dashPattern={[1, 4]} lineCap="round" />
          <Circle center={values.control} radius={4} fill="white" stroke="gray" />
        </>
      )}
      {values.curveKind === 'cubic' && (
        <>
          <Draw way={['A', values.control1]} stroke="gray" dashPattern={[1, 4]} lineCap="round" />
          <Draw way={[values.control2, 'B']} stroke="gray" dashPattern={[1, 4]} lineCap="round" />
          <Circle center={values.control1} radius={4} fill="white" stroke="gray" />
          <Circle center={values.control2} radius={4} fill="white" stroke="gray" />
        </>
      )}
      {values.curveKind === 'bend' && <Draw way={['A', 'B']} stroke="gray" dashPattern={[1, 4]} lineCap="round" />}
      {values.curveKind === 'arc' && (
        <>
          <Draw
            way={[CurveCenter, pointOnEllipse(CurveCenter, values.radius, values.radius, values.startAngle)]}
            stroke="gray"
            dashPattern={[1, 4]}
            lineCap="round"
          />
          <Draw
            way={[CurveCenter, pointOnEllipse(CurveCenter, values.radius, values.radius, values.endAngle)]}
            stroke="gray"
            dashPattern={[1, 4]}
            lineCap="round"
          />
        </>
      )}
      {values.curveKind === 'circle' && (
        <Draw
          way={[CurveCenter, pointOnEllipse(CurveCenter, values.radius, values.radius, 0)]}
          stroke="gray"
          dashPattern={[1, 4]}
          lineCap="round"
        />
      )}
      {values.curveKind === 'ellipse' && (
        <>
          <Draw
            way={[CurveCenter, pointOnEllipse(CurveCenter, values.radiusX, values.radiusY, 0)]}
            stroke="gray"
            dashPattern={[1, 4]}
            lineCap="round"
          />
          <Draw
            way={[CurveCenter, pointOnEllipse(CurveCenter, values.radiusX, values.radiusY, 90)]}
            stroke="gray"
            dashPattern={[1, 4]}
            lineCap="round"
          />
        </>
      )}
      <Draw way={wayOf(values)} stroke="dodgerblue" strokeWidth={2} />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Draw 曲线操作 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;

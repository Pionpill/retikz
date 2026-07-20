import type { FC, ReactNode } from 'react';

import { Circle, Draw, Layout, Node, Path, Step } from '@retikz/react';

import type { PreviewControlValuesFor, PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { stepCurvesControls } from './step-curves.controls';

export const previewControls = stepCurvesControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

type StepCurveValues = PreviewControlValuesFor<typeof stepCurvesControls>;

const CurveCenter: [number, number] = [0, 0];

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

const SmoothPoints: Array<[number, number]> = [
  [-100, 25],
  [-35, -55],
  [35, 30],
  [100, -40],
];

/** 渲染面板选中的 Step 曲线动作 */
const curveOf = (values: StepCurveValues): ReactNode => {
  switch (values.stepKind) {
    case 'curve':
      return <Step kind="curve" to="B" control={values.control} />;
    case 'cubic':
      return <Step kind="cubic" to="B" control1={values.control1} control2={values.control2} />;
    case 'bend':
      return <Step kind="bend" to="B" bendDirection={values.bendDirection} bendAngle={values.bendAngle} />;
    case 'smooth':
      return <Step kind="smooth" points={SmoothPoints.slice(1)} tension={values.tension} />;
    case 'arc':
      return <Step kind="arc" startAngle={values.startAngle} endAngle={values.endAngle} radius={values.radius} />;
    case 'circlePath':
      return <Step kind="circlePath" radius={values.radius} />;
    case 'ellipsePath':
      return <Step kind="ellipsePath" radius={{ x: values.radiusX, y: values.radiusY }} />;
  }
};

/** Step curve / cubic / bend / smooth / arc / circle / ellipse playground */
const Demo: FC = () => {
  const values = usePreviewControls(stepCurvesControls);
  const usesEndpoints = values.stepKind === 'curve' || values.stepKind === 'cubic' || values.stepKind === 'bend';
  const isSmooth = values.stepKind === 'smooth';
  const start = isSmooth ? SmoothPoints[0] : usesEndpoints ? 'A' : 'C';

  return (
    <Layout width={380} height={260} viewBox={{ x: -150, y: -130, width: 300, height: 260 }}>
      {usesEndpoints && (
        <>
          <Node id="A" position={[-100, 0]} stroke="gray" dashed>
            a
          </Node>
          <Node id="B" position={[100, 0]} stroke="gray" dashed>
            b
          </Node>
        </>
      )}
      {!usesEndpoints && !isSmooth && (
        <Node id="C" position={CurveCenter} stroke="none">
          ·
        </Node>
      )}
      {values.stepKind === 'curve' && (
        <>
          <Draw way={['A', values.control]} stroke="gray" dashPattern={[1, 4]} lineCap="round" />
          <Draw way={[values.control, 'B']} stroke="gray" dashPattern={[1, 4]} lineCap="round" />
          <Circle center={values.control} radius={4} fill="white" stroke="gray" />
        </>
      )}
      {values.stepKind === 'cubic' && (
        <>
          <Draw way={['A', values.control1]} stroke="gray" dashPattern={[1, 4]} lineCap="round" />
          <Draw way={[values.control2, 'B']} stroke="gray" dashPattern={[1, 4]} lineCap="round" />
          <Circle center={values.control1} radius={4} fill="white" stroke="gray" />
          <Circle center={values.control2} radius={4} fill="white" stroke="gray" />
        </>
      )}
      {values.stepKind === 'bend' && <Draw way={['A', 'B']} stroke="gray" dashPattern={[1, 4]} lineCap="round" />}
      {values.stepKind === 'smooth' && <Draw way={SmoothPoints} stroke="gray" dashPattern={[1, 4]} lineCap="round" />}
      {values.stepKind === 'arc' && (
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
      {values.stepKind === 'circlePath' && (
        <Draw
          way={[CurveCenter, pointOnEllipse(CurveCenter, values.radius, values.radius, 0)]}
          stroke="gray"
          dashPattern={[1, 4]}
          lineCap="round"
        />
      )}
      {values.stepKind === 'ellipsePath' && (
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
      <Path stroke="dodgerblue" strokeWidth={2}>
        <Step kind="move" to={start} />
        {curveOf(values)}
      </Path>
      {isSmooth &&
        SmoothPoints.map((point, index) => (
          <Circle key={index} center={point} radius={3} fill="dodgerblue" stroke="none" />
        ))}
    </Layout>
  );
};

export default Demo;

import type { FC, ReactNode } from 'react';

import { createDefaultInspectorRegistry, STROKE_PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { InspectLayout, InspectPath, InspectScope } from '@retikz/inspect/react';
import { Node, Path, Scope, Step } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { inspectSelectionControls, InspectSelectionTarget, previewControlContract } from './inspect-selection.controls';

export const previewControls = inspectSelectionControls;

const registry = createDefaultInspectorRegistry();

type CurveProps = Readonly<{
  inspect: boolean;
  controlPoints: boolean;
  labels: boolean;
  mirrored?: boolean;
}>;

/** 绘制一条可选择是否附加 runtime-only Inspector request 的曲线 */
const Curve: FC<CurveProps> = props => {
  const { inspect, controlPoints, labels, mirrored = false } = props;
  const steps = (
    <>
      <Step kind="move" to={[-72, mirrored ? -26 : 26]} />
      <Step
        kind="cubic"
        control1={[-36, mirrored ? 58 : -58]}
        control2={[36, mirrored ? -58 : 58]}
        to={[72, mirrored ? 26 : -26]}
      />
    </>
  );

  return inspect ? (
    <InspectPath
      request={{ inspector: STROKE_PATH_INSPECTOR_KEY, value: { controlPoints, labels } }}
      stroke="dimgray"
      strokeWidth={3}
    >
      {steps}
    </InspectPath>
  ) : (
    <Path stroke="dimgray" strokeWidth={3}>
      {steps}
    </Path>
  );
};

/** 按 controls 状态构造右侧普通 Scope 或不可重开的 barrier */
const renderRightScope = (children: ReactNode, barrier: boolean) =>
  barrier ? (
    <InspectScope request={false} transforms={[{ kind: 'translate', x: 110, y: 0 }]}>
      {children}
    </InspectScope>
  ) : (
    <Scope transforms={[{ kind: 'translate', x: 110, y: 0 }]}>{children}</Scope>
  );

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const inspectLeft = values.target !== InspectSelectionTarget.Right;
  const inspectRight = values.target !== InspectSelectionTarget.Left;

  return (
    <InspectLayout registry={registry} width={440} height={240} viewBox={{ x: -220, y: -120, width: 440, height: 240 }}>
      <Scope transforms={[{ kind: 'translate', x: -110, y: 0 }]}>
        <Curve inspect={inspectLeft} controlPoints={values.controlPoints} labels={values.labels} />
        <Node position={[0, 88]} stroke="none" padding={0} textColor="gray">
          A
        </Node>
      </Scope>
      {renderRightScope(
        <>
          <Curve inspect={inspectRight} controlPoints={values.controlPoints} labels={values.labels} mirrored />
          <Node position={[0, 88]} stroke="none" padding={0} textColor="gray">
            B
          </Node>
        </>,
        values.barrierRight,
      )}
    </InspectLayout>
  );
});

export const previewSource = controlledPreview.source;

/** 比较局部 Path request 与 Scope barrier 的选择结果 */
const Demo: FC = controlledPreview.Component;

export default Demo;

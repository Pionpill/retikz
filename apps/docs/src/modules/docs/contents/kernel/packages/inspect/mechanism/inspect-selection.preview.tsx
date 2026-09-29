import { createDefaultInspectorRegistry, PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { InspectLayout, InspectPath, InspectScope } from '@retikz/inspect/react';
import { Node, Path, Scope, Step } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { InspectSelectionTarget } from './inspect-selection.controls';

const registry = createDefaultInspectorRegistry();

type CurveProps = Readonly<{
  inspect: boolean;
  controlPoints: boolean;
  labels: boolean;
  mirrored?: boolean;
}>;

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
      request={{ inspector: PATH_INSPECTOR_KEY, options: { controlPoints, labels } }}
      style={{ stroke: 'dimgray', strokeWidth: 3 }}
    >
      {steps}
    </InspectPath>
  ) : (
    <Path style={{ stroke: 'dimgray', strokeWidth: 3 }}>{steps}</Path>
  );
};

const renderRightScope = (children: ReactNode, barrier: boolean) =>
  barrier ? (
    <InspectScope request={false} transforms={[{ kind: 'translate', x: 110, y: 0 }]}>
      {children}
    </InspectScope>
  ) : (
    <Scope transforms={[{ kind: 'translate', x: 110, y: 0 }]}>{children}</Scope>
  );

/** 图形参数 */
export type InspectSelectionPreviewValues = {
  target: 'left' | 'right' | 'both';
  controlPoints: boolean;
  labels: boolean;
  barrierRight: boolean;
};

/** 绘制示例图形 */
export const InspectSelectionPreview = (values: InspectSelectionPreviewValues) => {
  const inspectLeft = values.target !== InspectSelectionTarget.Right;
  const inspectRight = values.target !== InspectSelectionTarget.Left;

  return (
    <InspectLayout registry={registry}>
      <Scope transforms={[{ kind: 'translate', x: -110, y: 0 }]}>
        <Curve inspect={inspectLeft} controlPoints={values.controlPoints} labels={values.labels} />
        <Node position={[0, 88]} style={{ stroke: 'none', textColor: 'gray' }} layout={{ padding: 0 }}>
          A
        </Node>
      </Scope>
      {renderRightScope(
        <>
          <Curve inspect={inspectRight} controlPoints={values.controlPoints} labels={values.labels} mirrored />
          <Node position={[0, 88]} style={{ stroke: 'none', textColor: 'gray' }} layout={{ padding: 0 }}>
            B
          </Node>
        </>,
        values.barrierRight,
      )}
    </InspectLayout>
  );
};

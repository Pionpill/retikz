import type { IRScopePosition, IRScopeSelfPoint } from '@retikz/core';
import { Draw, Layout, Node, Scope } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';
import type { InputTransform } from '@retikz/vanilla';

const selfPointOf = (
  value: ScopeTranslateBasicPreviewValues['selfAnchor'] | ScopeTranslateBasicPreviewValues['pivot'],
  explicitPoint: ScopeTranslateBasicPreviewValues['selfPoint'] | ScopeTranslateBasicPreviewValues['pivotPoint'],
): IRScopeSelfPoint => (value === 'explicit' ? explicitPoint : value);

const positionOf = (values: ScopeTranslateBasicPreviewValues): IRScopePosition =>
  values.positionEnabled
    ? {
        kind: 'anchor',
        target: { id: values.positionTarget },
        selfAnchor: selfPointOf(values.selfAnchor, values.selfPoint),
      }
    : values.originPosition;

const transformOf = (values: ScopeTranslateBasicPreviewValues): InputTransform => {
  switch (values.operation) {
    case 'translate':
      return { kind: 'translate', x: values.translateX, y: values.translateY };
    case 'polar-translate':
      return {
        kind: 'polar-translate',
        origin: values.referent,
        angle: values.polarAngle,
        radius: values.distance,
      };
    case 'at-translate':
      return {
        kind: 'at-translate',
        of: values.referent,
        direction: values.direction,
        distance: values.distance,
      };
    case 'offset-translate':
      return {
        kind: 'offset-translate',
        of: values.referent,
        offset: [values.offsetX, values.offsetY],
      };
    case 'between-translate':
      return {
        kind: 'between-translate',
        between: [{ id: 'O' }, { id: 'T' }],
        fraction: values.fraction,
      };
    case 'rotate':
      return {
        kind: 'rotate',
        degrees: values.rotateDegrees,
        pivot: selfPointOf(values.pivot, values.pivotPoint),
      };
    case 'scale':
      return {
        kind: 'scale',
        x: values.scaleX,
        y: values.scaleY,
        pivot: selfPointOf(values.pivot, values.pivotPoint),
      };
  }
};

/** 图形参数 */
export type ScopeTranslateBasicPreviewValues = {
  operation:
    | 'translate'
    | 'polar-translate'
    | 'at-translate'
    | 'offset-translate'
    | 'between-translate'
    | 'rotate'
    | 'scale';
  positionEnabled: boolean;
  originPosition: [number, number];
  referent: 'O' | 'T';
  positionTarget: 'O' | 'T';
  selfAnchor: 'center' | 'right' | 'bottom-right' | 'top-left' | 'explicit' | 'origin';
  selfPoint: [number, number];
  translateX: number;
  translateY: number;
  offsetX: number;
  offsetY: number;
  polarAngle: number;
  distance: number;
  direction: 'left' | 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'top-left';
  fraction: number;
  rotateDegrees: number;
  scaleX: number;
  scaleY: number;
  pivot: 'center' | 'right' | 'bottom-right' | 'top-left' | 'explicit' | 'origin';
  pivotPoint: [number, number];
};

/** 绘制示例图形 */
export const ScopeTranslateBasicPreview = (values: ScopeTranslateBasicPreviewValues) => {
  return (
    <Layout>
      <Node id="O" position={[-100, 0]} shape="circle" style={{ stroke: 'none', fill: 'none' }} layout={{ padding: 4 }}>
        o
      </Node>
      <Node
        id="T"
        position={[100, 0]}
        shape="circle"
        style={{ stroke: 'none', fill: 'none' }}
        layout={{ padding: 4 }}
      />
      <Node position={[100, -32]} style={{ stroke: 'none', fill: 'none' }} layout={{ padding: 0 }}>
        t
      </Node>
      <Circle
        center={{ id: 'O' }}
        radius={14}
        style={{ stroke: 'gray', fill: 'none', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Circle
        center={{ id: 'T' }}
        radius={14}
        style={{ stroke: 'gray', fill: 'none', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Draw way={['O', 'T']} style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }} />

      <Scope position={positionOf(values)} transforms={[transformOf(values)]}>
        <Circle center={[0, 0]} radius={3} style={{ fill: 'gray', stroke: 'none' }} />
        <Node
          id="Q"
          position={[30, -20]}
          style={{ fill: 'none' }}
          layout={{ minimumSize: { width: 80, height: 80 }, padding: 0 }}
        >
          q
        </Node>
      </Scope>
    </Layout>
  );
};

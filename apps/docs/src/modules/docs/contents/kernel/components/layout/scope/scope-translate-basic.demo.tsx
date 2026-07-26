import type { IRScopePlacement, IRScopeSelfPoint, IRTransformInput } from '@retikz/core';
import type { FC } from 'react';

import { Circle, Draw, Layout, Node, Scope } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scopeTranslateBasicControls } from './scope-translate-basic.controls';

/** controls registry 未刷新时供 ComponentPreview 从 demo 模块直接解析的兜底定义 */
export const previewControls = scopeTranslateBasicControls;

type ScopeTransformValues = PreviewControlValuesFor<typeof scopeTranslateBasicControls>;

/** 把面板中的闭合选项转换为 Scope 自身点 */
const selfPointOf = (
  value: ScopeTransformValues['selfAnchor'] | ScopeTransformValues['pivot'],
  explicitPoint: ScopeTransformValues['selfPoint'] | ScopeTransformValues['pivotPoint'],
): IRScopeSelfPoint => (value === 'explicit' ? explicitPoint : value);

/** 把自身定位面板值转换为 Scope placement */
const placementOf = (values: ScopeTransformValues): IRScopePlacement | undefined =>
  values.placementEnabled
    ? {
        target: { id: values.placementTarget },
        selfAnchor: selfPointOf(values.selfAnchor, values.selfPoint),
      }
    : undefined;

/** 把面板值转换为当前选中的 Scope transform 输入 */
const transformOf = (values: ScopeTransformValues): IRTransformInput => {
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

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout width={400} height={230} viewBox={{ x: -260, y: -150, width: 520, height: 300 }}>
      <Node id="O" position={[-100, 0]} shape="circle" padding={4} stroke="none" fill="none">
        o
      </Node>
      <Node id="T" position={[100, 0]} shape="circle" padding={4} stroke="none" fill="none">
        t
      </Node>
      <Circle center={{ id: 'O' }} radius={14} stroke="gray" fill="none" dashPattern={[1, 4]} lineCap="round" />
      <Circle center={{ id: 'T' }} radius={14} stroke="gray" fill="none" dashPattern={[1, 4]} lineCap="round" />
      <Draw way={['O', 'T']} stroke="gray" dashPattern={[1, 4]} lineCap="round" />

      <Scope placement={placementOf(values)} transforms={[transformOf(values)]}>
        <Circle center={[0, 0]} radius={3} fill="gray" stroke="none" />
        <Node id="Q" position={[30, -20]} minimumSize={{ width: 80, height: 80 }} padding={0} fill="none">
          q
        </Node>
      </Scope>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * Scope 局部坐标 playground
 * @description O / T 是 Scope 外的固定参照点；偏心方形 Q 提供固有包络，小圆点只标记局部原点
 */
const Demo: FC = controlledPreview.Component;

export default Demo;

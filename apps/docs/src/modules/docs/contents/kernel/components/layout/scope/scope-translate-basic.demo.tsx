import type { IRTransformInput } from '@retikz/core';
import type { FC } from 'react';

import { Circle, Draw, Layout, Node, Scope } from '@retikz/react';

import type { PreviewControlValuesFor, PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { scopeTranslateBasicControls } from './scope-translate-basic.controls';

/** controls registry 未刷新时供 ComponentPreview 从 demo 模块直接解析的兜底定义 */
export const previewControls = scopeTranslateBasicControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

type ScopeTransformValues = PreviewControlValuesFor<typeof scopeTranslateBasicControls>;

/** 把面板值转换为当前选中的 Scope transform 输入 */
const transformOf = (values: ScopeTransformValues): IRTransformInput => {
  switch (values.transformKind) {
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
        cx: values.rotateCenterX,
        cy: values.rotateCenterY,
      };
    case 'scale':
      return { kind: 'scale', x: values.scaleX, y: values.scaleY };
  }
};

/**
 * Scope 局部 transform playground
 * @description O / T 是 Scope 外的固定参照点；局部坐标轴与 Q 共享面板选中的 transform，调整时只改变 Scope 子图
 */
const Demo: FC = () => {
  const values = usePreviewControls(scopeTranslateBasicControls);

  return (
    <Layout width={400} height={217} viewBox={{ x: -240, y: -130, width: 480, height: 260 }}>
      <Node id="O" position={[-100, 0]} shape="circle" padding={4} stroke="none" fill="none">
        o
      </Node>
      <Node id="T" position={[100, 0]} shape="circle" padding={4} stroke="none" fill="none">
        t
      </Node>
      <Circle center={{ id: 'O' }} radius={14} stroke="gray" fill="none" dashPattern={[1, 4]} lineCap="round" />
      <Circle center={{ id: 'T' }} radius={14} stroke="gray" fill="none" dashPattern={[1, 4]} lineCap="round" />
      <Draw way={['O', 'T']} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" />

      <Scope transforms={[transformOf(values)]}>
        <Draw
          way={[
            [0, 0],
            [80, 0],
          ]}
          arrow="->"
        />
        <Draw
          way={[
            [0, 0],
            [0, -80],
          ]}
          arrow="->"
        />
        <Node id="Q" position={[45, -40]} shape="circle" padding={4}>
          q
        </Node>
        <Draw
          way={[
            [45, 0],
            [45, -40],
          ]}
          stroke="lightgray"
          dashPattern={[1, 4]}
          lineCap="round"
        />
        <Draw
          way={[
            [0, -40],
            [45, -40],
          ]}
          stroke="lightgray"
          dashPattern={[1, 4]}
          lineCap="round"
        />
      </Scope>
    </Layout>
  );
};

export default Demo;

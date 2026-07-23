import type { IRNodeTarget } from '@retikz/core';
import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeAnchorPositionControls, previewControlContract } from './node-anchor-position.controls';

export const previewControls = nodeAnchorPositionControls;

type NodeAnchorPositionValues = PreviewControlValuesFor<typeof nodeAnchorPositionControls>;

/** 把 controls 值转换为目标 Node 的 anchor 引用 */
const targetOf = (values: NodeAnchorPositionValues, withOffset: boolean): IRNodeTarget => ({
  id: 'A',
  anchor: values.targetAnchor,
  ...(withOffset ? { offset: [values.offsetX, values.offsetY] } : {}),
});

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const target = targetOf(values, true);
  return (
    <Layout width={400} height={230} viewBox={{ x: -220, y: -155, width: 440, height: 310 }}>
      <Node
        id="A"
        position={[-28, 0]}
        minimumSize={{ width: 126, height: 76 }}
        padding={0}
        margin={values.targetMargin}
        fill="none"
        stroke="gray"
        dashed
        rotate={values.targetRotate}
      >
        a
      </Node>

      <Draw
        way={[targetOf(values, false), target]}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
        zIndex={-1}
      />

      <Node
        id="Q"
        position={{ kind: 'anchor', target, selfAnchor: values.selfAnchor }}
        minimumSize={{ width: 54, height: 36 }}
        padding={{ left: 10, right: 2, top: 4, bottom: 8 }}
        scale={values.selfScale}
        fill="#f97316"
        stroke="none"
        textColor="white"
        rotate={values.selfRotate}
      >
        q
      </Node>

      <Node
        position={{ kind: 'anchor', target }}
        minimumSize={8}
        padding={0}
        shape="circle"
        fill="none"
        stroke="#94a3b8"
        strokeWidth={1}
        zIndex={1}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Node anchor-to-anchor 定位 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;

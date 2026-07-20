import type { FC } from 'react';

import { Coordinate, Draw, Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { coordinateBetweenControls, coordinateBetweenFrame } from './coordinate-between.controls';

export const previewControls = coordinateBetweenControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/**
 * 比例定位 `{ between: [A, B], fraction }`
 * @description A、B 固定在 x 轴上，面板连续调整同一个 q 的 fraction；同样的输入可用于 Node.position / Coordinate / Step.to
 */
const Demo: FC = () => {
  const values = usePreviewControls(coordinateBetweenControls);

  return (
    <Layout
      width={coordinateBetweenFrame.width}
      height={coordinateBetweenFrame.height}
      viewBox={coordinateBetweenFrame.viewBox}
    >
      <Node id="A" position={[-140, 0]} shape="circle" minimumSize={32} fill="dodgerblue" textColor="white">
        a
      </Node>
      <Node id="B" position={[140, 0]} shape="circle" minimumSize={32} fill="green" textColor="white">
        b
      </Node>
      <Draw way={['A', 'B']} stroke="lightgray" zIndex={-1} />
      <Coordinate id="Q" position={{ between: [{ id: 'A' }, { id: 'B' }], fraction: values.fraction }} />
      <Node
        id="marker"
        position={{ of: 'Q', offset: [0, 0] }}
        shape="circle"
        minimumSize={24}
        fill="darkorange"
        textColor="white"
      >
        q
      </Node>
    </Layout>
  );
};

export default Demo;

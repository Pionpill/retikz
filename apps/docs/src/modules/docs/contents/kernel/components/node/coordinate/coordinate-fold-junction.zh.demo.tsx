import type { FC } from 'react';

import { Coordinate, Draw, Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  coordinateFoldJunctionControls,
  coordinateFoldJunctionFrame,
  previewControlContract,
} from './coordinate-fold-junction.controls';

export const previewControls = coordinateFoldJunctionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout
      width={coordinateFoldJunctionFrame.width}
      height={coordinateFoldJunctionFrame.height}
      viewBox={coordinateFoldJunctionFrame.viewBox}
    >
      <Node id="A" position={[-120, -55]}>
        A
      </Node>
      <Node id="B" position={[-120, 55]}>
        B
      </Node>
      <Coordinate id="junction" position={[values.junctionX, values.junctionY]} />
      <Node id="out" position={[120, 0]} shape="diamond">
        汇合后
      </Node>
      {/* 两条线先各自走到 junction，再合并到 out */}
      <Draw way={['A', 'junction', 'out']} arrow="->" stroke="gray" />
      <Draw way={['B', 'junction']} stroke="gray" />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * Coordinate 作为命名拐点汇聚
 * @description 多个 step 节点向同一决策汇合点收敛，汇合点本身不画矩形 / 不打字；各 path 用 `<Draw way={['A', 'junction', 'B']}>` 经过它，coordinate 只有中心坐标，端点会贴到该中心。
 */
const Demo: FC = controlledPreview.Component;

export default Demo;

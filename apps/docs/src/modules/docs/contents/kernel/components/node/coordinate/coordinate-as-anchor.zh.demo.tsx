import type { FC } from 'react';

import { Coordinate, Draw, Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  coordinateAsAnchorControls,
  coordinateAsAnchorFrame,
  previewControlContract,
} from './coordinate-as-anchor.controls';

export const previewControls = coordinateAsAnchorControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout
      width={coordinateAsAnchorFrame.width}
      height={coordinateAsAnchorFrame.height}
      viewBox={coordinateAsAnchorFrame.viewBox}
    >
      <Draw way={coordinateAsAnchorFrame.xAxis} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" zIndex={-1} />
      <Draw way={coordinateAsAnchorFrame.yAxis} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" zIndex={-1} />
      {/* 命名虚拟中心——画面里看不见，但下面 4 个 of 引用都靠它 */}
      <Coordinate id="hub" position={[values.positionX, values.positionY]} />
      <Node id="N" position={{ direction: 'top', of: 'hub', distance: values.verticalDistance }}>
        北
      </Node>
      <Node id="S" position={{ direction: 'bottom', of: 'hub', distance: values.verticalDistance }}>
        南
      </Node>
      <Node id="E" position={{ direction: 'right', of: 'hub', distance: values.horizontalDistance }} shape="circle">
        东
      </Node>
      <Node id="W" position={{ direction: 'left', of: 'hub', distance: values.horizontalDistance }} shape="circle">
        西
      </Node>
      {/* 4 条 path 终止在 hub——视觉上汇于中心点；hub 是 coordinate 不画形状 */}
      <Draw way={['N', 'hub']} arrow="->" stroke="gray" />
      <Draw way={['S', 'hub']} arrow="->" stroke="gray" />
      <Draw way={['E', 'hub']} arrow="->" stroke="gray" />
      <Draw way={['W', 'hub']} arrow="->" stroke="gray" />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * `<Coordinate>` 作为命名虚拟锚点
 * @description hub 是不可见中心，4 个节点用 `position={{ of: 'hub', ... }}` 对称分布、4 条 path 都终止在 hub；固定坐标轴显出 hub 相对世界原点的位移。
 */
const Demo: FC = controlledPreview.Component;

export default Demo;

import { Coordinate, Draw, Layout, Node } from '@retikz/react';

import type { Lang } from '@/i18n';

import { coordinateAsAnchorFrame } from './coordinate-as-anchor.controls';
import { coordinateAsAnchorI18n } from './coordinate-as-anchor.i18n';

/** 图形参数 */
export type CoordinateAsAnchorPreviewValues = {
  positionX: number;
  positionY: number;
  verticalDistance: number;
  horizontalDistance: number;
};

/** 绘制示例图形 */
export const CoordinateAsAnchorPreview = (values: CoordinateAsAnchorPreviewValues, lang: Lang) => {
  const i18n = coordinateAsAnchorI18n[lang];
  return (
    <Layout>
      <Draw
        way={coordinateAsAnchorFrame.xAxis}
        zIndex={-1}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Draw
        way={coordinateAsAnchorFrame.yAxis}
        zIndex={-1}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      {/* 命名虚拟中心——画面里看不见，但下面 4 个 of 引用都靠它 */}
      <Coordinate id="hub" position={[values.positionX, values.positionY]} />
      <Node id="N" position={{ direction: 'top', of: 'hub', distance: values.verticalDistance }}>
        {i18n.north}
      </Node>
      <Node id="S" position={{ direction: 'bottom', of: 'hub', distance: values.verticalDistance }}>
        {i18n.south}
      </Node>
      <Node id="E" position={{ direction: 'right', of: 'hub', distance: values.horizontalDistance }} shape="circle">
        {i18n.east}
      </Node>
      <Node id="W" position={{ direction: 'left', of: 'hub', distance: values.horizontalDistance }} shape="circle">
        {i18n.west}
      </Node>
      {/* 4 条 path 终止在 hub——视觉上汇于中心点；hub 是 coordinate 不画形状 */}
      <Draw way={['N', 'hub']} arrow="->" style={{ stroke: 'gray' }} />
      <Draw way={['S', 'hub']} arrow="->" style={{ stroke: 'gray' }} />
      <Draw way={['E', 'hub']} arrow="->" style={{ stroke: 'gray' }} />
      <Draw way={['W', 'hub']} arrow="->" style={{ stroke: 'gray' }} />
    </Layout>
  );
};

import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  CUSTOM_COORDINATE_CONTROL_IDS,
  customCoordinateControls,
  previewControlContract,
} from './coordinate-custom-bridge.controls';
import { grid } from './coordinate-custom-bridge.data';
import { bridgeCoordinate } from './coordinate-custom-bridge.definition';

/** controls registry 缺失时使用的显式回退 */
export const previewControls = customCoordinateControls;

/** 使用 bridgeCoordinate 投影规则 (x,y) 网格：固定相机下，点随 x 位置产生竖直拱形偏移 */
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={480}
    height={250}
    viewBox={{ x: -30, y: -80, width: 480, height: 340 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Plot
      data={grid}
      width={420}
      height={220}
      coordinate={{ type: 'bridge', archHeight: values[CUSTOM_COORDINATE_CONTROL_IDS.archHeight] }}
      coordinates={[bridgeCoordinate]}
    >
      <PointMark x="x" y="y" />
      <Axis dimension="x" />
      <Axis dimension="y" />
    </Plot>
  </Layout>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;

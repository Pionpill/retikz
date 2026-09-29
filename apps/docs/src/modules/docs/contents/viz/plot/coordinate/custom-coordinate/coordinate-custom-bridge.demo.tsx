import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  CUSTOM_COORDINATE_CONTROL_IDS,
  customCoordinateControls,
  previewControlContract,
} from './coordinate-custom-bridge.controls';
import { CoordinateCustomBridgePreview } from './coordinate-custom-bridge.preview';

/** controls registry 缺失时使用的显式回退 */
export const previewControls = customCoordinateControls;

/** 使用 bridgeCoordinate 投影规则 (x,y) 网格：固定相机下，点随 x 位置产生竖直拱形偏移 */
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateCustomBridgePreview({
    archHeight: values[CUSTOM_COORDINATE_CONTROL_IDS.archHeight],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;

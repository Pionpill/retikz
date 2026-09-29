import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodePositionControls, previewControlContract } from './node-position.controls';
import { NodePositionPreview } from './node-position.preview';

export const previewControls = nodePositionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => NodePositionPreview(values));

export const previewSource = controlledPreview.source;

/**
 * Node 定位 playground
 * @description A / B 是固定参照节点；面板把同一个 Q 切换为五种 position 输入，让用户直接观察定位结果
 */
const Demo: FC = controlledPreview.Component;

export default Demo;

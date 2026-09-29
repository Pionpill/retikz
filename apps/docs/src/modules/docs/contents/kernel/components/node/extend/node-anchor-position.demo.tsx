import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeAnchorPositionControls, previewControlContract } from './node-anchor-position.controls';
import { NodeAnchorPositionPreview } from './node-anchor-position.preview';

export const previewControls = nodeAnchorPositionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => NodeAnchorPositionPreview(values));

export const previewSource = controlledPreview.source;

/** Node anchor-to-anchor 定位 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;

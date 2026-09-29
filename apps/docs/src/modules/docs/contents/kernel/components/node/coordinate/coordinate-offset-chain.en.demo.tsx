import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinateOffsetChainControls, previewControlContract } from './coordinate-offset-chain.en.controls';
import { CoordinateOffsetChainPreview } from './coordinate-offset-chain.preview';

export const previewControls = coordinateOffsetChainControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateOffsetChainPreview({
    rootX: values.rootX,
    rootY: values.rootY,
    stepX: values.stepX,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * Coordinate offset chain
 * @description ca → cb → cc are derived via `{ of, offset }`; fixed axes reveal how moving `ca` shifts the group relative to the world origin.
 */
const Demo: FC = controlledPreview.Component;

export default Demo;

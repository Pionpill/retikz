import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinateAsAnchorControls, previewControlContract } from './coordinate-as-anchor.en.controls';
import { CoordinateAsAnchorPreview } from './coordinate-as-anchor.preview';

export const previewControls = coordinateAsAnchorControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateAsAnchorPreview(
    {
      positionX: values.positionX,
      positionY: values.positionY,
      verticalDistance: values.verticalDistance,
      horizontalDistance: values.horizontalDistance,
    },
    'en',
  ),
);

export const previewSource = controlledPreview.source;

/**
 * `<Coordinate>` as a named virtual anchor
 * @description hub is an invisible center; four nodes use `position={{ of: 'hub', ... }}` symmetrically and all paths terminate there; fixed axes reveal its displacement from the world origin.
 */
const Demo: FC = controlledPreview.Component;

export default Demo;

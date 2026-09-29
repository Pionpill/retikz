import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinateFoldJunctionControls, previewControlContract } from './coordinate-fold-junction.en.controls';
import { CoordinateFoldJunctionPreview } from './coordinate-fold-junction.preview';

export const previewControls = coordinateFoldJunctionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateFoldJunctionPreview(
    {
      junctionX: values.junctionX,
      junctionY: values.junctionY,
    },
    'en',
  ),
);

export const previewSource = controlledPreview.source;

/**
 * Coordinate as a named junction for path convergence
 * @description Multiple step nodes converge to a shared decision junction with no rectangle or text; each path routes through via `<Draw way={['A', 'junction', 'B']}>`, and the Coordinate keeps only a center position for the endpoints to meet.
 */
const Demo: FC = controlledPreview.Component;

export default Demo;

import type { FC } from 'react';

import { DataTransformShapeFigure } from './data-transform-shape';

/** Table-shape comparison before and after a data transform */
const Demo: FC = () => (
  <DataTransformShapeFigure
    sourceTitle="Canonical detail · 4 × 3"
    resultTitle="Grouped summary · 2 × 3"
    east="East"
    west="West"
  />
);

export default Demo;

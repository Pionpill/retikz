import { createCoordinateDataControls } from '../coordinate-data-controls';
import { wind } from './coordinate-polar-line.data';

const dataControls = createCoordinateDataControls({
  copy: { title: 'Polar line', sectionLabel: 'Data', tableLabel: 'Wind direction and speed' },
  rows: wind,
  columns: [
    { key: 'angle', label: 'Angle' },
    { key: 'speed', label: 'Speed' },
  ],
  defaultCollapsed: true,
  relatedApis: ['Plot.coordinate', 'PathMark'],
});

/** English data panel for the polar line example */
export const coordinatePolarLineControls = dataControls.controls;

/** Stable documentation contract for the polar line example */
export const previewControlContract = dataControls.contract;

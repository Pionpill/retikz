import { createCoordinateDataControls } from '../coordinate-data-controls';
import { skills } from './coordinate-radar.data';

const dataControls = createCoordinateDataControls({
  copy: { title: 'Radar chart', sectionLabel: 'Data', tableLabel: 'Skill scores' },
  rows: skills,
  columns: [
    { key: 'dim', label: 'Dimension' },
    { key: 'value', label: 'Score' },
  ],
  defaultCollapsed: true,
  relatedApis: ['Plot.coordinate', 'PathMark'],
});

/** English data panel for the radar chart example */
export const coordinateRadarControls = dataControls.controls;

/** Stable documentation contract for the radar chart example */
export const previewControlContract = dataControls.contract;

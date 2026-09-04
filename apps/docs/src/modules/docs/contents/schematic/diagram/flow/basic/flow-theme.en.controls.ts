import { defineFlowThemeControlContract } from './flow-theme.controls';

/** Flow global configuration demo English controls contract */
export const previewControlContract = defineFlowThemeControlContract({
  title: 'Global configuration',
  entitySection: 'All Entities',
  entityColorLabel: 'Color',
  entityFillOpacityLabel: 'Fill opacity',
  entityStrokeWidthLabel: 'Stroke width',
  relationSection: 'All Relations',
  relationStrokeLabel: 'Line color',
  relationStrokeWidthLabel: 'Line width',
  relationStrokeOpacityLabel: 'Line opacity',
});

/** Flow global configuration demo English controls */
export const flowThemeControls = previewControlContract.controls;

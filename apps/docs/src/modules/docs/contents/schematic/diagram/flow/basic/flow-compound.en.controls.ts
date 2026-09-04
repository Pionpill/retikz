import { defineFlowCompoundControlContract } from './flow-compound.controls';

/** Flow grouping demo English controls contract */
export const previewControlContract = defineFlowCompoundControlContract({
  title: 'Grouped layout',
  groupSection: 'Visible Group',
  groupDirectionLabel: 'Automatic layout direction',
  directionOptions: [
    { value: 'up', label: 'Up' },
    { value: 'right', label: 'Right' },
    { value: 'down', label: 'Down' },
    { value: 'left', label: 'Left' },
  ],
  groupNodeGapLabel: 'Peer gap',
  groupRankGapLabel: 'Rank gap',
  layoutSection: 'Shell-free Layout',
  layoutDirectionLabel: 'Fixed placement direction',
  layoutGapLabel: 'Element gap',
  layoutAlignLabel: 'Cross-axis alignment',
  alignOptions: [
    { value: 'start', label: 'Start' },
    { value: 'center', label: 'Center' },
    { value: 'end', label: 'End' },
  ],
});

/** Flow grouping demo English controls */
export const flowCompoundControls = previewControlContract.controls;

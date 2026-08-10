import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { axisCartesianPlaygroundRows } from './axis-cartesian-playground.data';

/** English controls for the comprehensive Cartesian Axis example */
export const axisCartesianPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Cartesian Axis playground',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Shared samples',
          rows: axisCartesianPlaygroundRows,
          columns: [
            { key: 'category', label: 'Category' },
            { key: 'x', label: 'x' },
            { key: 'y', label: 'y' },
          ],
        },
      ],
    },
    {
      label: 'Scene',
      controls: [
        {
          kind: 'select',
          id: 'scene',
          label: 'Axis scene',
          defaultValue: 'continuous-edge',
          options: [
            { value: 'continuous-edge', label: 'Continuous · edge' },
            { value: 'continuous-origin', label: 'Continuous · origin' },
            { value: 'categorical', label: 'Categorical · labels' },
          ],
        },
      ],
    },
    {
      label: 'Candidate ticks',
      visibleWhen: { controlId: 'scene', oneOf: ['continuous-edge', 'continuous-origin'] },
      controls: [
        {
          kind: 'select',
          id: 'intervalStep',
          label: 'Fixed interval',
          defaultValue: '10',
          options: [
            { value: '5', label: '5' },
            { value: '10', label: '10' },
            { value: '20', label: '20' },
          ],
        },
        { kind: 'range', id: 'maxCount', label: 'Maximum shown', defaultValue: 7, min: 2, max: 12, step: 1 },
        { kind: 'range', id: 'minGap', label: 'Minimum gap', defaultValue: 32, min: 0, max: 60, step: 4 },
        {
          kind: 'select',
          id: 'markKind',
          label: 'Marker shape',
          defaultValue: 'line',
          options: [
            { value: 'line', label: 'Line' },
            { value: 'circle', label: 'Circle' },
            { value: 'triangle', label: 'Triangle' },
          ],
        },
      ],
    },
    {
      label: 'Grid',
      visibleWhen: { controlId: 'scene', oneOf: ['continuous-edge', 'continuous-origin'] },
      controls: [
        {
          kind: 'select',
          id: 'gridStep',
          label: 'Major-grid interval',
          defaultValue: '10',
          options: [
            { value: '5', label: '5' },
            { value: '10', label: '10' },
            { value: '20', label: '20' },
          ],
        },
        {
          kind: 'range',
          id: 'gridOpacity',
          label: 'Major-grid opacity',
          defaultValue: 0.45,
          min: 0.15,
          max: 1,
          step: 0.05,
        },
        { kind: 'switch', id: 'includeDomainEndpoints', label: 'Include domain endpoints', defaultValue: false },
        { kind: 'switch', id: 'showMinor', label: 'Show minor grid', defaultValue: true },
        {
          kind: 'select',
          id: 'minorStep',
          label: 'Minor-grid interval',
          defaultValue: '2.5',
          visibleWhen: { controlId: 'showMinor', oneOf: [true] },
          options: [
            { value: '1', label: '1' },
            { value: '2.5', label: '2.5' },
          ],
        },
      ],
    },
    {
      label: 'Category labels',
      visibleWhen: { controlId: 'scene', oneOf: ['categorical'] },
      controls: [
        {
          kind: 'select',
          id: 'rotation',
          label: 'Rotation',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: 'Automatic' },
            { value: '0', label: '0°' },
            { value: '-45', label: '-45°' },
            { value: '-90', label: '-90°' },
          ],
        },
        {
          kind: 'select',
          id: 'hideStrategy',
          label: 'Overlap handling',
          defaultValue: 'none',
          options: [
            { value: 'none', label: 'Keep all' },
            { value: 'greedy', label: 'Greedy hiding' },
            { value: 'parity', label: 'Parity hiding' },
          ],
        },
        {
          kind: 'select',
          id: 'overflow',
          label: 'Boundary overflow',
          defaultValue: 'flush',
          options: [
            { value: 'allow', label: 'Allow' },
            { value: 'hide', label: 'Hide' },
            { value: 'flush', label: 'Flush inward' },
          ],
        },
      ],
    },
    {
      label: 'Origin and endpoints',
      visibleWhen: { controlId: 'scene', oneOf: ['continuous-origin'] },
      controls: [
        {
          kind: 'select',
          id: 'crossingLabel',
          label: 'Origin label',
          defaultValue: 'corner',
          options: [
            { value: 'show', label: 'Show beside axis' },
            { value: 'hide', label: 'Hide' },
            { value: 'corner', label: 'Move to corner' },
          ],
        },
        {
          kind: 'select',
          id: 'corner',
          label: 'Corner',
          defaultValue: 'bottom-left',
          visibleWhen: { controlId: 'crossingLabel', oneOf: ['corner'] },
          options: [
            { value: 'top-left', label: 'Top left' },
            { value: 'top-right', label: 'Top right' },
            { value: 'bottom-left', label: 'Bottom left' },
            { value: 'bottom-right', label: 'Bottom right' },
          ],
        },
        { kind: 'switch', id: 'showArrow', label: 'Show positive arrow', defaultValue: true },
        {
          kind: 'range',
          id: 'endpointDistance',
          label: 'Tick avoidance distance',
          defaultValue: 12,
          min: 0,
          max: 24,
          step: 2,
          visibleWhen: { controlId: 'showArrow', oneOf: [true] },
        },
      ],
    },
  ],
});

/** Stable documentation contract for the comprehensive Cartesian Axis example */
export const previewControlContract = {
  controls: axisCartesianPlaygroundControls,
  canonicalValues: {
    scene: 'continuous-edge',
    intervalStep: '10',
    maxCount: 7,
    minGap: 32,
    markKind: 'line',
    gridStep: '10',
    gridOpacity: 0.45,
    includeDomainEndpoints: false,
    showMinor: true,
    minorStep: '2.5',
    rotation: 'auto',
    hideStrategy: 'none',
    overflow: 'flush',
    crossingLabel: 'corner',
    corner: 'bottom-left',
    showArrow: true,
    endpointDistance: 12,
  },
  relatedApis: [
    'Axis.ticks.interval',
    'Axis.ticks.density',
    'Axis.ticks.mark',
    'Axis.grid',
    'Axis.grid.includeDomainEndpoints',
    'Axis.grid.minor',
    'Axis.tickLabels.layout',
    'Axis.placement',
    'Axis.crossing',
    'Axis.line.arrow',
    'Axis.ticks.endpoint',
  ],
} satisfies PreviewControlContract;

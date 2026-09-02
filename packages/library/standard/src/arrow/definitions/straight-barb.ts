import type { CoreDependencyProvider } from '@retikz/core';

import { defineArrow } from '@retikz/core';

import { StandardArrowName } from '../constants';

/** 可选开放直线倒钩箭头 Definition */
export const StraightBarbArrowDefinition = defineArrow({
  name: StandardArrowName.StraightBarb,
  hollow: true,
  lineContactX: 9,
  tipX: 9,
  emit: context => [
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [1, 1] },
        { kind: 'line', to: [9, 5] },
        { kind: 'line', to: [1, 9] },
      ],
      stroke: typeof context.stroke === 'string' ? context.stroke : { kind: 'contextStroke' },
      strokeWidth: context.lineWidth,
    },
  ],
});

/** StraightBarb 箭头的静态 Core provider */
export const StraightBarbArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: StraightBarbArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => StraightBarbArrowDefinition,
});

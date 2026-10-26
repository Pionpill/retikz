import type { CoreDependencyProvider } from '@retikz/core';
import { defineArrow } from '@retikz/core';

import { BuiltinExtensionArrowName } from '../constants';

/** 可选开放直线倒钩箭头 Definition */
export const StraightBarbArrowDefinition = defineArrow({
  name: BuiltinExtensionArrowName.StraightBarb,
  hollow: true,
  backX: 1,
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
      fill: 'none',
      stroke: context.stroke,
      strokeWidth: context.lineWidth,
    },
  ],
});

/** StraightBarb 箭头的静态 Core provider */
export const StraightBarbArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: StraightBarbArrowDefinition.name }),
  makeDefinition: () => StraightBarbArrowDefinition,
});

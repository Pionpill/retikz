import type { CoreDependencyProvider } from '@retikz/core';

import { defineArrow } from '@retikz/core';

import { StandardArrowName } from '../constants';
import { filledPath, hollowPath } from './_utils';

/** 可选实心方形箭头 Definition */
export const SquareArrowDefinition = defineArrow({
  name: StandardArrowName.Square,
  backX: 0,
  lineContactX: 0,
  emit: context => [
    filledPath(context, [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]),
  ],
});

/** Square 箭头的静态 Core provider */
export const SquareArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: SquareArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => SquareArrowDefinition,
});

/** 可选空心方形箭头 Definition */
export const OpenSquareArrowDefinition = defineArrow({
  name: StandardArrowName.OpenSquare,
  hollow: true,
  backX: 1,
  lineContactX: 1,
  tipX: 9,
  emit: context => [
    hollowPath(
      context,
      [
        [1, 1],
        [9, 1],
        [9, 9],
        [1, 9],
      ],
      { strokeLinejoin: 'round' },
    ),
  ],
});

/** OpenSquare 箭头的静态 Core provider */
export const OpenSquareArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: OpenSquareArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => OpenSquareArrowDefinition,
});

import type { CoreDependencyProvider } from '@retikz/core';

import { defineArrow } from '@retikz/core';

import { StandardArrowName } from '../constants';
import { filledPath, hollowPath } from './_utils';

/** 可选实心菱形箭头 Definition */
export const DiamondArrowDefinition = defineArrow({
  name: StandardArrowName.Diamond,
  lineContactX: 0,
  emit: context => [
    filledPath(context, [
      [0, 5],
      [5, 0],
      [10, 5],
      [5, 10],
    ]),
  ],
});

/** Diamond 箭头的静态 Core provider */
export const DiamondArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: DiamondArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => DiamondArrowDefinition,
});

/** 可选空心菱形箭头 Definition */
export const OpenDiamondArrowDefinition = defineArrow({
  name: StandardArrowName.OpenDiamond,
  hollow: true,
  lineContactX: 1,
  tipX: 9,
  emit: context => [
    hollowPath(
      context,
      [
        [1, 5],
        [5, 1],
        [9, 5],
        [5, 9],
      ],
      { strokeLinejoin: 'round' },
    ),
  ],
});

/** OpenDiamond 箭头的静态 Core provider */
export const OpenDiamondArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: OpenDiamondArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => OpenDiamondArrowDefinition,
});

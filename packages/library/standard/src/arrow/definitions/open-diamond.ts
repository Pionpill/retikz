import type { CoreDependencyProvider } from '@retikz/core';

import { defineArrow } from '@retikz/core';

import { StandardArrowName } from '../constants';
import { hollowPath } from './marker';

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

const makeOpenDiamondArrowDefinition = () => OpenDiamondArrowDefinition;

/** OpenDiamond 箭头的静态 Core provider */
export const OpenDiamondArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: OpenDiamondArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeOpenDiamondArrowDefinition,
});

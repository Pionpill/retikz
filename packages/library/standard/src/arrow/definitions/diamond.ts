import type { CoreDependencyProvider } from '@retikz/core';

import { defineArrow } from '@retikz/core';

import { StandardArrowName } from '../constants';
import { filledPath } from './marker';

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

const makeDiamondArrowDefinition = () => DiamondArrowDefinition;

/** Diamond 箭头的静态 Core provider */
export const DiamondArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: DiamondArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeDiamondArrowDefinition,
});

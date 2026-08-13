import type { CoreDependencyProvider } from '@retikz/core';

import { defineArrow } from '@retikz/core';

import { StandardArrowName } from '../constants';
import { hollowPath } from './marker';

/** 可选空心三角箭头 Definition */
export const OpenArrowDefinition = defineArrow({
  name: StandardArrowName.Open,
  hollow: true,
  lineContactX: 1,
  tipX: 9,
  emit: context => [
    hollowPath(context, [
      [1, 1],
      [9, 5],
      [1, 9],
    ]),
  ],
});

const makeOpenArrowDefinition = () => OpenArrowDefinition;

/** Open 箭头的静态 Core provider */
export const OpenArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: OpenArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeOpenArrowDefinition,
});

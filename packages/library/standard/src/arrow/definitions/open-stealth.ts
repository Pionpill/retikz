import type { CoreDependencyProvider } from '@retikz/core';

import { defineArrow } from '@retikz/core';

import { StandardArrowName } from '../constants';
import { hollowPath } from './marker';

/** 可选空心 stealth 箭头 Definition */
export const OpenStealthArrowDefinition = defineArrow({
  name: StandardArrowName.OpenStealth,
  hollow: true,
  lineContactX: 3,
  tipX: 9,
  emit: context => [
    hollowPath(
      context,
      [
        [1, 1],
        [9, 5],
        [1, 9],
        [3, 5],
      ],
      { strokeLinejoin: 'miter' },
    ),
  ],
});

const makeOpenStealthArrowDefinition = () => OpenStealthArrowDefinition;

/** OpenStealth 箭头的静态 Core provider */
export const OpenStealthArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: OpenStealthArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeOpenStealthArrowDefinition,
});

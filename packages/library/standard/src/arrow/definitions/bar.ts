import type { CoreDependencyProvider } from '@retikz/core';

import { defineArrow } from '@retikz/core';

import { StandardArrowName } from '../constants';
import { openStrokePath } from './_utils';

/** 可选 Bar 箭头 Definition */
export const BarArrowDefinition = defineArrow({
  name: StandardArrowName.Bar,
  hollow: true,
  backX: 9,
  lineContactX: 9,
  tipX: 9,
  emit: context => [
    openStrokePath(context, [
      {
        from: [9, 1],
        to: [9, 9],
      },
    ]),
  ],
});

/** Bar 箭头的静态 Core provider */
export const BarArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: BarArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => BarArrowDefinition,
});

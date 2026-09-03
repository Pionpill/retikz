import type { CoreDependencyProvider } from '@retikz/core';

import { defineArrow } from '@retikz/core';

import { StandardArrowName } from '../constants';
import { openStrokePath } from './_utils';

/** 可选 CrowFoot 箭头 Definition */
export const CrowFootArrowDefinition = defineArrow({
  name: StandardArrowName.CrowFoot,
  hollow: true,
  backX: 1,
  lineContactX: 1,
  tipX: 9,
  emit: context => [
    openStrokePath(context, [
      { from: [1, 5], to: [9, 1] },
      { from: [1, 5], to: [9, 5] },
      { from: [1, 5], to: [9, 9] },
    ]),
  ],
});

/** CrowFoot 箭头的静态 Core provider */
export const CrowFootArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: CrowFootArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => CrowFootArrowDefinition,
});

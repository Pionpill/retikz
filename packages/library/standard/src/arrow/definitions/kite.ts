import type { CoreDependencyProvider } from '@retikz/core';

import { defineArrow } from '@retikz/core';

import { StandardArrowName } from '../constants';
import { filledPath, hollowPath } from './_utils';

/** 可选实心风筝形箭头 Definition */
export const KiteArrowDefinition = defineArrow({
  name: StandardArrowName.Kite,
  lineContactX: 0,
  emit: context => [
    filledPath(context, [
      [0, 5],
      [2.5, 2.5],
      [10, 5],
      [2.5, 7.5],
    ]),
  ],
});

/** Kite 箭头的静态 Core provider */
export const KiteArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: KiteArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => KiteArrowDefinition,
});

/** 可选空心风筝形箭头 Definition */
export const OpenKiteArrowDefinition = defineArrow({
  name: StandardArrowName.OpenKite,
  hollow: true,
  lineContactX: 1,
  tipX: 9,
  emit: context => [
    hollowPath(
      context,
      [
        [1, 5],
        [3, 3],
        [9, 5],
        [3, 7],
      ],
      { strokeLinejoin: 'round' },
    ),
  ],
});

/** OpenKite 箭头的静态 Core provider */
export const OpenKiteArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: OpenKiteArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => OpenKiteArrowDefinition,
});

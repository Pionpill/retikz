import type { CoreDependencyProvider } from '@retikz/core';
import { defineArrow } from '@retikz/core';

import { BuiltinExtensionArrowName } from '../constants';
import { buildFilledPath, buildHollowPath } from './marker-path';

/** 可选实心风筝形箭头 Definition */
export const kiteArrowDefinition = defineArrow({
  name: BuiltinExtensionArrowName.Kite,
  backX: 0,
  lineContactX: 0,
  defaultLength: 11,
  defaultWidth: 6,
  emit: context => [
    buildFilledPath(context, [
      [0, 5],
      [2.5, 0],
      [10, 5],
      [2.5, 10],
    ]),
  ],
});

/** Kite 箭头的静态 Core provider */
export const kiteArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: kiteArrowDefinition.name }),
  makeDefinition: () => kiteArrowDefinition,
});

/** 可选空心风筝形箭头 Definition */
export const openKiteArrowDefinition = defineArrow({
  name: BuiltinExtensionArrowName.OpenKite,
  hollow: true,
  backX: 1,
  lineContactX: 1,
  tipX: 9,
  defaultLength: 11,
  defaultWidth: 6,
  emit: context => [
    buildHollowPath(
      context,
      [
        [1, 5],
        [3, 1],
        [9, 5],
        [3, 9],
      ],
      { lineJoin: 'round' },
    ),
  ],
});

/** OpenKite 箭头的静态 Core provider */
export const openKiteArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: openKiteArrowDefinition.name }),
  makeDefinition: () => openKiteArrowDefinition,
});

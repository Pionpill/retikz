import type { CoreDependencyProvider } from '@retikz/core';
import { defineArrow } from '@retikz/core';

import { BuiltinExtensionArrowName } from '../constants';
import { buildFilledPath, buildHollowPath } from './marker-path';

/** 可选实心菱形箭头 Definition */
export const diamondArrowDefinition = defineArrow({
  name: BuiltinExtensionArrowName.Diamond,
  backX: 0,
  lineContactX: 0,
  defaultLength: 11,
  defaultWidth: 6,
  emit: context => [
    buildFilledPath(context, [
      [0, 5],
      [5, 0],
      [10, 5],
      [5, 10],
    ]),
  ],
});

/** Diamond 箭头的静态 Core provider */
export const diamondArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: diamondArrowDefinition.name }),
  makeDefinition: () => diamondArrowDefinition,
});

/** 可选空心菱形箭头 Definition */
export const openDiamondArrowDefinition = defineArrow({
  name: BuiltinExtensionArrowName.OpenDiamond,
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
        [5, 1],
        [9, 5],
        [5, 9],
      ],
      { lineJoin: 'round' },
    ),
  ],
});

/** OpenDiamond 箭头的静态 Core provider */
export const openDiamondArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: openDiamondArrowDefinition.name }),
  makeDefinition: () => openDiamondArrowDefinition,
});

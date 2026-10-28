import type { CoreDependencyProvider } from '@retikz/core';
import { defineArrow } from '@retikz/core';

import { BuiltinExtensionArrowName } from '../constants';
import { buildFilledPath, buildHollowPath } from './marker-path';

/** 可选实心方形箭头 Definition */
export const squareArrowDefinition = defineArrow({
  name: BuiltinExtensionArrowName.Square,
  backX: 0,
  lineContactX: 0,
  emit: context => [
    buildFilledPath(context, [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]),
  ],
});

/** Square 箭头的静态 Core provider */
export const squareArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: squareArrowDefinition.name }),
  makeDefinition: () => squareArrowDefinition,
});

/** 可选空心方形箭头 Definition */
export const openSquareArrowDefinition = defineArrow({
  name: BuiltinExtensionArrowName.OpenSquare,
  hollow: true,
  backX: 1,
  lineContactX: 1,
  tipX: 9,
  emit: context => [
    buildHollowPath(
      context,
      [
        [1, 1],
        [9, 1],
        [9, 9],
        [1, 9],
      ],
      { lineJoin: 'round' },
    ),
  ],
});

/** OpenSquare 箭头的静态 Core provider */
export const openSquareArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: openSquareArrowDefinition.name }),
  makeDefinition: () => openSquareArrowDefinition,
});

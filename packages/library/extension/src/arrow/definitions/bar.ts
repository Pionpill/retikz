import type { CoreDependencyProvider } from '@retikz/core';
import { defineArrow } from '@retikz/core';

import { BuiltinExtensionArrowName } from '../constants';
import { buildOpenStrokePath } from './marker-path';

/** 可选 Bar 箭头 Definition */
export const barArrowDefinition = defineArrow({
  name: BuiltinExtensionArrowName.Bar,
  hollow: true,
  backX: 9,
  lineContactX: 9,
  tipX: 9,
  emit: context => [
    buildOpenStrokePath(context, [
      {
        from: [9, 1],
        to: [9, 9],
      },
    ]),
  ],
});

/** Bar 箭头的静态 Core provider */
export const barArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: barArrowDefinition.name }),
  makeDefinition: () => barArrowDefinition,
});

import type { CoreDependencyProvider } from '@retikz/core';
import { defineArrow } from '@retikz/core';

import { BuiltinExtensionArrowName } from '../constants';
import { buildOpenStrokePath } from './marker-path';

/** 可选 CrowFoot 箭头 Definition */
export const crowFootArrowDefinition = defineArrow({
  name: BuiltinExtensionArrowName.CrowFoot,
  hollow: true,
  backX: 1,
  lineContactX: 1,
  tipX: 9,
  emit: context => [
    buildOpenStrokePath(context, [
      { from: [1, 5], to: [9, 1] },
      { from: [1, 5], to: [9, 5] },
      { from: [1, 5], to: [9, 9] },
    ]),
  ],
});

/** CrowFoot 箭头的静态 Core provider */
export const crowFootArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: crowFootArrowDefinition.name }),
  makeDefinition: () => crowFootArrowDefinition,
});

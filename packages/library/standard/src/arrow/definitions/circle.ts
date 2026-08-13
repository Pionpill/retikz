import type { CoreDependencyProvider } from '@retikz/core';

import { defineArrow } from '@retikz/core';

import { StandardArrowName } from '../constants';

/** 可选实心圆点箭头 Definition */
export const CircleArrowDefinition = defineArrow({
  name: StandardArrowName.Circle,
  lineContactX: 0,
  emit: context => [
    {
      type: 'ellipse',
      cx: 5,
      cy: 5,
      rx: 5,
      ry: 5,
      fill: typeof context.fill === 'string' ? context.fill : { kind: 'contextStroke' },
    },
  ],
});

const makeCircleArrowDefinition = () => CircleArrowDefinition;

/** Circle 箭头的静态 Core provider */
export const CircleArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: CircleArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeCircleArrowDefinition,
});

import type { CoreDependencyProvider } from '@retikz/core';

import { defineArrow } from '@retikz/core';

import { StandardArrowName } from '../constants';

/** 可选空心圆点箭头 Definition */
export const OpenCircleArrowDefinition = defineArrow({
  name: StandardArrowName.OpenCircle,
  hollow: true,
  lineContactX: 0.75,
  emit: context => [
    {
      type: 'ellipse',
      cx: 5,
      cy: 5,
      rx: 4.25,
      ry: 4.25,
      stroke: typeof context.stroke === 'string' ? context.stroke : { kind: 'contextStroke' },
      strokeWidth: context.lineWidth,
    },
  ],
});

const makeOpenCircleArrowDefinition = () => OpenCircleArrowDefinition;

/** OpenCircle 箭头的静态 Core provider */
export const OpenCircleArrowProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'arrow', name: OpenCircleArrowDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeOpenCircleArrowDefinition,
});

import { parseWay } from '@retikz/core';
import type { Child, RibbonBoundaryConfig, RibbonConfig, Way } from './types';

export type RibbonBuilder = {
  (way: Way, config: RibbonConfig): Child;
  (config: RibbonBoundaryConfig): Child;
};

export const ribbon: RibbonBuilder = (
  ...args: [way: Way, config: RibbonConfig] | [config: RibbonBoundaryConfig]
): Child => {
  if (args.length === 2) {
    return {
      type: 'ribbon',
      children: parseWay(args[0]),
      ...args[1],
    };
  }
  const { upper, lower, ...rest } = args[0];
  return {
    type: 'ribbon',
    ...rest,
    kind: 'boundary',
    upper: parseWay(upper),
    lower: parseWay(lower),
  };
};

import { parseWay } from '@retikz/core';
import type { Child, RibbonConfig, Way } from './types';

export const ribbon = (way: Way, config: RibbonConfig): Child => ({
  type: 'ribbon',
  children: parseWay(way),
  ...config,
});

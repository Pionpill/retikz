import type { FC, ReactNode } from 'react';
import type { IRRibbon } from '@retikz/core';
import { TIKZ_RIBBON } from './_displayNames';
import type { HydrationEventProps } from './event-props';

export type RibbonProps = HydrationEventProps & {
  id?: IRRibbon['id'];
  meta?: IRRibbon['meta'];
  animations?: IRRibbon['animations'];
  color?: IRRibbon['color'];
  width: IRRibbon['width'];
  startDirection?: IRRibbon['startDirection'];
  endDirection?: IRRibbon['endDirection'];
  samples?: IRRibbon['samples'];
  fill?: IRRibbon['fill'];
  fillOpacity?: IRRibbon['fillOpacity'];
  stroke?: IRRibbon['stroke'];
  strokeWidth?: IRRibbon['strokeWidth'];
  drawOpacity?: IRRibbon['drawOpacity'];
  opacity?: IRRibbon['opacity'];
  shadow?: IRRibbon['shadow'];
  blendMode?: IRRibbon['blendMode'];
  zIndex?: IRRibbon['zIndex'];
  children: ReactNode;
};

export const Ribbon: FC<RibbonProps> = () => null;
Ribbon.displayName = TIKZ_RIBBON;

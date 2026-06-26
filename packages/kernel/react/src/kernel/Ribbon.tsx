import type { FC, ReactNode } from 'react';
import type { IRRibbon } from '@retikz/core';
import { TIKZ_RIBBON, TIKZ_RIBBON_LOWER, TIKZ_RIBBON_UPPER } from './_displayNames';
import type { HydrationEventProps } from './event-props';

export type RibbonProps = HydrationEventProps & {
  kind?: IRRibbon['kind'];
  id?: IRRibbon['id'];
  meta?: IRRibbon['meta'];
  animations?: IRRibbon['animations'];
  color?: IRRibbon['color'];
  width?: IRRibbon['width'];
  start?: IRRibbon['start'];
  end?: IRRibbon['end'];
  interpolation?: IRRibbon['interpolation'];
  align?: IRRibbon['align'];
  samples?: IRRibbon['samples'];
  sampling?: IRRibbon['sampling'];
  fill?: IRRibbon['fill'];
  fillOpacity?: IRRibbon['fillOpacity'];
  stroke?: IRRibbon['stroke'];
  strokeWidth?: IRRibbon['strokeWidth'];
  drawOpacity?: IRRibbon['drawOpacity'];
  opacity?: IRRibbon['opacity'];
  shadow?: IRRibbon['shadow'];
  blendMode?: IRRibbon['blendMode'];
  zIndex?: IRRibbon['zIndex'];
  upper?: IRRibbon['upper'];
  lower?: IRRibbon['lower'];
  children?: ReactNode;
};

export type RibbonBoundaryProps = {
  children?: ReactNode;
};

export type RibbonComponent = FC<RibbonProps> & {
  Upper: FC<RibbonBoundaryProps>;
  Lower: FC<RibbonBoundaryProps>;
};

const RibbonUpper: FC<RibbonBoundaryProps> = () => null;
RibbonUpper.displayName = TIKZ_RIBBON_UPPER;

const RibbonLower: FC<RibbonBoundaryProps> = () => null;
RibbonLower.displayName = TIKZ_RIBBON_LOWER;

export const Ribbon: RibbonComponent = (() => null) as unknown as RibbonComponent;
Ribbon.displayName = TIKZ_RIBBON;
Ribbon.Upper = RibbonUpper;
Ribbon.Lower = RibbonLower;

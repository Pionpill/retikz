import type { ValueOf } from '../types';
import type { Anchor, CenterAnchor, Corner, Side } from './constants';

export type CenterAnchorValue = ValueOf<typeof CenterAnchor>;

export type SideValue = ValueOf<typeof Side>;

export type CornerValue = ValueOf<typeof Corner>;

export type AnchorValue = ValueOf<typeof Anchor>;

export type SideInput = SideValue;

export type AnchorInput = CenterAnchorValue | AnchorValue;

export type DirectionalAnchorInput = AnchorValue;

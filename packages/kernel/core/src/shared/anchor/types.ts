import type { ValueOf } from '../../types';
import type {
  CenterAnchor,
  CompassAnchor,
  CompassCorner,
  CompassSide,
  TikzAnchor,
  TikzCorner,
  TikzSide,
  WebAnchor,
  WebCorner,
  WebSide,
} from './constants';

export type CenterAnchorValue = ValueOf<typeof CenterAnchor>;

export type WebSideValue = ValueOf<typeof WebSide>;

export type WebCornerValue = ValueOf<typeof WebCorner>;

export type WebAnchorValue = ValueOf<typeof WebAnchor>;

export type CompassSideValue = ValueOf<typeof CompassSide>;

export type CompassCornerValue = ValueOf<typeof CompassCorner>;

export type CompassAnchorValue = ValueOf<typeof CompassAnchor>;

export type TikzSideValue = ValueOf<typeof TikzSide>;

export type TikzCornerValue = ValueOf<typeof TikzCorner>;

export type TikzAnchorValue = ValueOf<typeof TikzAnchor>;

export type SideInput = WebSideValue | CompassSideValue | TikzSideValue;

export type AnchorInput = CenterAnchorValue | WebAnchorValue | CompassAnchorValue | TikzAnchorValue;

export type DirectionalAnchorInput = WebAnchorValue | CompassAnchorValue | TikzAnchorValue;

export type WebSideInput = SideInput;

export type WebAnchorInput = DirectionalAnchorInput;

export type CompassAnchorInput = CompassSideValue | CompassCornerValue;

export type TikzAnchorInput = TikzSideValue | TikzCornerValue;

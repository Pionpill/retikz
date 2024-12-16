export type LayoutPaddingDistanceProps = {
  p?: string | number;
  px?: string | number;
  py?: string | number;
  pl?: string | number;
  pr?: string | number;
  pt?: string | number;
  pb?: string | number;
};

export type LayoutMarginDistanceProps = {
  m?: string | number;
  mx?: string | number;
  my?: string | number;
  ml?: string | number;
  mr?: string | number;
  mt?: string | number;
  mb?: string | number;
};

export type LayoutBorderDistanceProps = {
  b?: string | number;
  bx?: string | number;
  by?: string | number;
  bl?: string | number;
  br?: string | number;
  bt?: string | number;
  bb?: string | number;
};

export type LayoutDistanceProps = LayoutPaddingDistanceProps & LayoutMarginDistanceProps & LayoutBorderDistanceProps;

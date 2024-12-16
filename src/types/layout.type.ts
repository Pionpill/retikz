export type LayoutPaddingProps = {
  padding?: string | number;
  paddingX?: string | number;
  paddingY?: string | number;
  paddingLeft?: string | number;
  paddingRight?: string | number;
  paddingTop?: string | number;
  paddingBottom?: string | number;
};

export type LayoutMarginProps = {
  margin?: string | number;
  marginX?: string | number;
  marginY?: string | number;
  marginLeft?: string | number;
  marginRight?: string | number;
  marginTop?: string | number;
  marginBottom?: string | number;
};

export type LayoutBorderProps = {
  border?: string | number;
  borderX?: string | number;
  borderY?: string | number;
  borderLeft?: string | number;
  borderRight?: string | number;
  borderTop?: string | number;
  borderBottom?: string | number;
};

export type LayoutProps = LayoutPaddingProps & LayoutMarginProps & LayoutBorderProps;
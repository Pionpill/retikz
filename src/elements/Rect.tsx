import { forwardRef, PropsWithChildren, SVGProps } from 'react';

export type RectProps = SVGProps<SVGRectElement>;

const Rect = forwardRef<SVGRectElement, PropsWithChildren<RectProps>>((props, ref) => {
  const { ...otherProps } = props;
  return <rect ref={ref} {...otherProps} />;
});

export default Rect;

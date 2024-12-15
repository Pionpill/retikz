import { FC, PropsWithChildren, Ref, SVGProps } from 'react';

export type RectProps = {
  ref?: Ref<SVGRectElement>;
} & SVGProps<SVGRectElement>;

const Rect: FC<PropsWithChildren<RectProps>> = props => {
  const { ref, ...otherProps } = props;
  return <rect ref={ref} {...otherProps} />;
};

export default Rect;

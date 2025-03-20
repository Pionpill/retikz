import { forwardRef, SVGProps } from 'react';

export type PathProps = {} & SVGProps<SVGPathElement>;

const Path = forwardRef<SVGPathElement, PathProps>((props, ref) => {
  const { fill: propFill, strokeWidth: propStrokeWidth, stroke: propStroke, ...otherProps } = props;

  const defaultProps = {
    fill: propFill || 'transparent',
    strokeWidth: propStrokeWidth ?? 1,
    stroke: propStroke || 'currentColor',
  };

  return <path ref={ref} {...defaultProps} {...otherProps} />;
});

export default Path;

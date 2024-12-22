import { FC, SVGProps } from 'react';

export type PathProps = {} & SVGProps<SVGPathElement>;

const Path: FC<PathProps> = props => {
  const { fill: propFill, strokeWidth: propStrokeWidth, stroke: propStroke, ...otherProps } = props;

  const defaultProps = {
    fill: propFill || 'transparent',
    strokeWidth: propStrokeWidth || 1,
    stroke: propStroke || 'currentColor',
  };

  return <path {...defaultProps} {...otherProps} />;
};

export default Path;

import { FC, SVGProps } from 'react';

export type PathProps = {} & SVGProps<SVGPathElement>;

const Path: FC<PathProps> = props => {
  return <path {...props} />;
};

export default Path;
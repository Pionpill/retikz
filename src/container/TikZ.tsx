import { FC, PropsWithChildren } from 'react';
import Surface, { SurfaceProps } from './Surface';
import { TikZContext } from '../hooks/useNodes';

const TikZ: FC<PropsWithChildren<SurfaceProps>> = props => {
  return (
    <TikZContext value={{ nodes: new Map() }}>
      <Surface {...props} />
    </TikZContext>
  );
};

export default TikZ;

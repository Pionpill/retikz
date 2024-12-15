import { FC, PropsWithChildren } from 'react';
import Surface, { SurfaceProps } from './Surface';
import { TikZContext } from '../hooks/useTikZ';

const TikZ: FC<PropsWithChildren<SurfaceProps>> = props => {
  return (
    <TikZContext value={{ elements: new Map() }}>
      <Surface {...props} />
    </TikZContext>
  );
};

export default TikZ;

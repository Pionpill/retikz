import { FC, ReactNode } from 'react';
import Surface, { SurfaceProps } from './Surface';
import { TikZContext } from '../hooks/tikz/TikZContext';

export type TikZProps = {
  children: ReactNode;
  integerMode?: boolean;
} & SurfaceProps;

const TikZ: FC<TikZProps> = props => {
  const { integerMode, ...resProps } = props;

  return (
    <TikZContext value={{ nodes: new Map(), integerMode: !!integerMode }}>
      <Surface {...resProps} />
    </TikZContext>
  );
};

export default TikZ;

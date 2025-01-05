import { FC, ReactNode } from 'react';
import Surface, { SurfaceProps } from './Surface';
import { NodesContext } from '../hooks/tikz/useNodes';
import { CalculateContext } from '../hooks/tikz/useIntegerMode';

export type TikZProps = {
  children: ReactNode;
  integerMode?: boolean;
} & SurfaceProps;

const TikZ: FC<TikZProps> = props => {
  const { integerMode, ...resProps } = props;

  return (
    <NodesContext value={new Map()}>
      <CalculateContext value={{ integerMode: !!integerMode }}>
        <Surface {...resProps} />
      </CalculateContext>
    </NodesContext>
  );
};

export default TikZ;

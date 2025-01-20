import { FC, ReactNode } from 'react';
import Surface, { SurfaceProps } from '../container/Surface';
import { CalculateContext, CalculateProps } from '../hooks/context/useCalculate';
import { NodesContext } from '../hooks/context/useNodes';
import { ScopeContext, ScopeProps } from '../hooks/context/useScope';

export type TikZProps = {
  children: ReactNode;
} & Partial<CalculateProps> &
  ScopeProps &
  SurfaceProps;

const TikZ: FC<TikZProps> = props => {
  const { precision = 2, offset, node, draw, ...resProps } = props;

  return (
    <NodesContext value={new Map()}>
      <CalculateContext value={{ precision }}>
        <ScopeContext value={{ offset, node, draw }}>
          <Surface {...resProps} />
        </ScopeContext>
      </CalculateContext>
    </NodesContext>
  );
};

export default TikZ;

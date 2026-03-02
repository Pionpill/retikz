import type { FC, ReactNode } from 'react';
import type { SurfaceProps } from '../container/Surface';
import Surface from '../container/Surface';
import type { CalculateProps } from '../hooks/context/useCalculate';
import { CalculateContext } from '../hooks/context/useCalculate';
import { NodesContext } from '../hooks/context/useNodes';
import type { ScopeProps } from '../hooks/context/useScope';
import { ScopeContext } from '../hooks/context/useScope';

export type TikZProps = {
  children: ReactNode;
} & Partial<CalculateProps> &
  ScopeProps &
  SurfaceProps;

const TikZ: FC<TikZProps> = props => {
  const { precision = 2, offset, node, draw, ...resProps } = props;

  return (
    <NodesContext.Provider value={new Map()}>
      <CalculateContext.Provider value={{ precision }}>
        <ScopeContext.Provider value={{ offset, node, draw }}>
          <Surface {...resProps} />
        </ScopeContext.Provider>
      </CalculateContext.Provider>
    </NodesContext.Provider>
  );
};

export default TikZ;

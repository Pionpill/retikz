import { createContext, useContext } from 'react';
import type { DrawProps } from '../../components/draw/Draw';
import type { NodeProps } from '../../components/node';
import type { Position } from '../../types/coordinate/descartes';

export type ScopeProps = {
  offset?: Position;
  node?: Omit<NodeProps, 'name' | 'ref' | 'position' | 'offset'>;
  draw?: Omit<DrawProps, 'ref' | 'way' | 'offset'>;
};

export const ScopeContext = createContext<ScopeProps>({});

const useScope = () => useContext(ScopeContext);

export default useScope;

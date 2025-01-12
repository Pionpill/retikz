import { createContext, useContext } from 'react';
import { Position } from '../../types/coordinate/descartes';
import { NodeProps } from '../../components/node';
import { DrawProps } from '../../components/draw';

export type ScopeProps = {
  offset?: Position;
  node?: Omit<NodeProps, 'name' | 'ref'>
  draw?: Omit<DrawProps, 'ref'>
};

export const ScopeContext = createContext<ScopeProps>({});

const useScope = () => useContext(ScopeContext);

export default useScope;

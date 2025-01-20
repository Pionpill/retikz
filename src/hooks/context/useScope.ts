import { createContext, useContext } from 'react';
import { DrawProps } from '../../components/draw/Draw';
import { NodeProps } from '../../components/node';
import { Position } from '../../types/coordinate/descartes';

export type ScopeProps = {
  offset?: Position;
  node?: Omit<NodeProps, 'name' | 'ref' | 'position' | 'offset'>
  draw?: Omit<DrawProps, 'ref' | 'way' | 'offset'>
};

export const ScopeContext = createContext<ScopeProps>({});

const useScope = () => useContext(ScopeContext);

export default useScope;

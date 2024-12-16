import { createContext, useContext } from 'react';
import RectNodeElement from '../model/RectNodeElement';

export const TikZContext = createContext<{ elements: Map<string, RectNodeElement> }>({
  elements: new Map(),
});

const useTikZ = () => useContext(TikZContext);

export default useTikZ;

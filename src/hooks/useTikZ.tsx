import { createContext, useContext } from 'react';
import TikZSvgElement from '../model/TikZSvgElement';

export const TikZContext = createContext<{ elements: Map<string, TikZSvgElement> }>({
  elements: new Map(),
});

const useTikZ = () => useContext(TikZContext);

export default useTikZ;

import { createContext, useContext } from 'react';

/** 当前渲染的 MDX 页面路径片段。 */
export const DemoLocationContext = createContext<Array<string> | null>(null);

/** 读取当前 MDX 页面路径片段。 */
export const useDemoSegments = (): Array<string> | null => useContext(DemoLocationContext);

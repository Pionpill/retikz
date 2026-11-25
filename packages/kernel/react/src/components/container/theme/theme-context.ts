import type { IRTheme } from '@retikz/core';
import type { Context } from 'react';
import { createContext, useContext } from 'react';

/** 按字段覆盖嵌套 React Theme Provider，未声明 selector 继续继承 */
export const mergeThemeOverlays = (...layers: ReadonlyArray<IRTheme | undefined>): IRTheme | undefined => {
  const merged: IRTheme = {};
  for (const layer of layers) {
    if (layer?.name !== undefined) merged.name = layer.name;
    if (layer?.mode !== undefined) merged.mode = layer.mode;
  }
  return merged.name === undefined && merged.mode === undefined ? undefined : merged;
};

/** React 子树继承的 sparse Theme */
export const ThemeContext: Context<IRTheme | undefined> = createContext<IRTheme | undefined>(undefined);

/** 读取最近的 ambient Theme */
export const useTheme = (): IRTheme | undefined => useContext(ThemeContext);

import type { IRScene } from '@retikz/core';
import type { Context } from 'react';

import { createContext, useContext } from 'react';

/** 按字段覆盖嵌套 React Theme Provider，未声明 selector 继续继承 */
export const mergeThemeOverlays = (
  ...layers: ReadonlyArray<IRScene['theme'] | undefined>
): IRScene['theme'] | undefined => {
  const merged = layers.reduce<NonNullable<IRScene['theme']>>(
    (current, layer) => (layer === undefined ? current : { ...current, ...layer }),
    {},
  );
  return Object.keys(merged).length === 0 ? undefined : merged;
};

/** React 子树继承的 sparse Theme */
export const ThemeContext: Context<IRScene['theme'] | undefined> = createContext<IRScene['theme'] | undefined>(
  undefined,
);

/** 读取最近的 ambient Theme */
export const useTheme = (): IRScene['theme'] | undefined => useContext(ThemeContext);

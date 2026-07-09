import { createContext, useContext } from 'react';

import type { PreviewControlState } from '../types';

/** 自定义预览控件的共享状态上下文。 */
export const PreviewControlStateContext = createContext<PreviewControlState>({
  values: {},
  setValue: () => undefined,
});

/** 读取自定义预览控件的共享状态上下文。 */
export const usePreviewControlContext = (): PreviewControlState => useContext(PreviewControlStateContext);

/** 读取指定预览控件的当前值，未设置时回退到调用方给定默认值。 */
export const usePreviewControlValue = (id: string, fallback: string): string => {
  const { values } = usePreviewControlContext();
  return values[id] ?? fallback;
};

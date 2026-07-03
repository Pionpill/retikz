import { createContext, useContext } from 'react';

import type { PreviewActionState } from '../types';

/** 自定义预览动作的选择器状态上下文。 */
export const PreviewActionStateContext = createContext<PreviewActionState>({
  values: {},
  setValue: () => undefined,
});

/** 读取自定义预览动作的选择器状态上下文。 */
export const usePreviewActionContext = (): PreviewActionState => useContext(PreviewActionStateContext);

/** 读取指定预览动作的当前值，未设置时回退到调用方给定默认值。 */
export const usePreviewActionValue = (id: string, fallback: string): string => {
  const { values } = usePreviewActionContext();
  return values[id] ?? fallback;
};

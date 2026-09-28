import { createContext, useContext } from 'react';

/** 预览区域的实际 CSS 像素尺寸，供 demo 重新布局 */
export type PreviewDimensions = { width: number; height: number };

/** 仅响应式宿主提供尺寸，普通预览保留 demo 自身尺寸 */
export const PreviewDimensionsContext = createContext<PreviewDimensions | undefined>(undefined);

/** 获取未应用手动缩放的预览容器尺寸 */
export const usePreviewDimensions = (): PreviewDimensions | undefined => useContext(PreviewDimensionsContext);

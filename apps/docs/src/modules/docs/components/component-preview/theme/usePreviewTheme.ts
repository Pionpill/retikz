import type { IRScene } from '@retikz/core';

import { useMemo } from 'react';

import { useComponentPreviewStore } from '@/modules/docs/store';

import { resolvePreviewTheme } from './constants';

/** 从持久化 docs 偏好生成稳定的 preview Theme */
export const usePreviewTheme = (): IRScene['theme'] => {
  const themeStyle = useComponentPreviewStore(state => state.themeStyle);

  return useMemo(() => resolvePreviewTheme(themeStyle), [themeStyle]);
};

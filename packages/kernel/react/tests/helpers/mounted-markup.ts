import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

/** 挂载场景，读取 renderer 已提交的 DOM 后释放会话 */
export const mountedMarkup = (node: ReactNode): string => {
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    flushSync(() => root.render(node));
    return container.innerHTML;
  } finally {
    root.unmount();
  }
};

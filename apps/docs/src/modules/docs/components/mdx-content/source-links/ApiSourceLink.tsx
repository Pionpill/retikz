import type { FC, ReactNode } from 'react';

import { useRightPanelStore } from '@/modules/docs/store';

export type ApiSourceLinkProps = {
  /** 在右侧源码面板中显示的 API 名称 */
  label: string;
  /** 仓库根目录下的源码路径 */
  path: string;
  /** API 声明起始行 */
  startLine: number;
  /** API 声明结束行 */
  endLine?: number;
  /** 作为链接展示的 API 摘要 */
  children: ReactNode;
};

/** API Reference 中打开右侧源码面板的摘要链接 */
export const ApiSourceLink: FC<ApiSourceLinkProps> = props => {
  const { label, path, startLine, endLine, children } = props;
  const openSource = useRightPanelStore(state => state.openSource);

  return (
    <button
      type="button"
      data-source-link-open="true"
      onClick={() => openSource({ label, path, startLine, endLine })}
      className="cursor-pointer text-left underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
    >
      {children}
    </button>
  );
};

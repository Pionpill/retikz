import { FileText, X } from 'lucide-react';
import { type FC, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useAiChatStore } from '@/store/use-ai-chat-store';

/**
 * Header 内的 chips 列表（仅展示，添加走 toolbar 的 + 按钮）
 * @description 当前页自动入选；chips 仅 border、无背景；header 容器在外层
 *   控制 max-h + flex-wrap 让 chips 超过 2 行时内部滚动
 */
export const AiChatInputContextChips: FC = () => {
  const { t } = useTranslation();
  const currentPage = useAiChatStore(s => s.currentPage);
  const contextSelection = useAiChatStore(s => s.contextSelection);
  const addContext = useAiChatStore(s => s.addContext);
  const removeContext = useAiChatStore(s => s.removeContext);

  // 只在 currentPage 切换时触发；用户手动 remove 后不会自动加回，避免循环
  const currentPath = currentPage?.path ?? null;
  useEffect(() => {
    if (!currentPage) return;
    addContext({ path: currentPage.path, title: currentPage.title });
  }, [currentPath, addContext, currentPage]);

  return (
    <>
      {contextSelection.map(item => {
        const isCurrent = currentPage?.path === item.path;
        return (
          <span
            key={item.path}
            className="flex shrink-0 items-center gap-1 rounded border border-border bg-transparent px-1.5 py-0.5 text-[11px]"
          >
            <FileText className="size-2.5 text-muted-foreground" />
            <span className="truncate">{item.title}</span>
            {isCurrent && <span className="text-[10px] text-muted-foreground">·{t('ai.convCurrentPageTag')}</span>}
            <button
              type="button"
              onClick={() => removeContext(item.path)}
              className="flex size-3.5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Remove"
            >
              <X className="size-2.5" />
            </button>
          </span>
        );
      })}
    </>
  );
};

import { Plus } from 'lucide-react';
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DocsSearchPanel } from '@/components/shared/docs-search';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAiChatStore } from '@/store/use-ai-chat-store';

/** popover 内的 Command 紧凑变体：input h-9、item py-1.5、icon size-3.5 */
const COMPACT_COMMAND_CLASS =
  '**:data-[slot=command-input-wrapper]:h-9 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-9 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-1.5 [&_[cmdk-item]_svg]:h-3.5 [&_[cmdk-item]_svg]:w-3.5';

/**
 * Toolbar 的 + 按钮 —— 点击弹 Add Context 命令面板（DocsSearchPanel 多选）
 * @description 单 toggle：点击同一条 entry 切换已选状态，popover 保持打开；Esc 关闭。
 *   当前页置顶为快捷入口（pinnedPaths），与下方主分组互斥不重复
 */
export const AiChatInputAddContextButton: FC = () => {
  const { t } = useTranslation();
  const contextSelection = useAiChatStore(s => s.contextSelection);
  const addContext = useAiChatStore(s => s.addContext);
  const removeContext = useAiChatStore(s => s.removeContext);
  const currentPage = useAiChatStore(s => s.currentPage);

  const [open, setOpen] = useState(false);

  const selectedPaths = new Set(contextSelection.map(c => c.path));
  const pinnedPaths = currentPage ? [currentPage.path] : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex size-7 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={t('ai.convAddContext')}
        title={t('ai.convAddContext')}
      >
        <Plus className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-[380px] overflow-hidden p-0">
        <DocsSearchPanel
          active={open}
          placeholder={t('common.searchPlaceholder')}
          emptyText={t('common.searchEmpty')}
          commandClassName={COMPACT_COMMAND_CLASS}
          isSelected={entry => selectedPaths.has(entry.path)}
          pinnedPaths={pinnedPaths}
          pinnedHeading={t('ai.convCurrentPageTag')}
          onSelect={entry => {
            if (selectedPaths.has(entry.path)) {
              removeContext(entry.path);
            } else {
              addContext({ path: entry.path, title: entry.label });
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

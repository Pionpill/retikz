import { Search } from 'lucide-react';
import { type FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Shortcut } from '@/components/shared/shortcut';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { DocsSearchPanel } from './DocsSearchPanel';

/**
 * 全站文档搜索（Cmd+K）
 * @description 触发器是 outline 输入框样按钮，点击或 Ctrl/Cmd+K 打开 Dialog；内部 Command UI 由
 *   DocsSearchPanel 提供，与 AI Chat 的 Add Context 共用一份匹配 / 渲染逻辑
 */
export type DocsSearchProps = { className?: string };
export const DocsSearch: FC<DocsSearchProps> = props => {
  const { className } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* 移动端：图标按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className={cn('size-7 cursor-pointer rounded-sm lg:hidden', className)}
        onClick={() => setOpen(true)}
        aria-label={t('common.searchHint')}
        title={t('common.searchHint')}
      >
        <Search className="size-4" />
      </Button>
      {/* 桌面端：输入框样式触发器 —— 点击或 Ctrl/Cmd+K 打开 Dialog */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('common.searchHint')}
        className={cn(
          'hidden lg:inline-flex h-8 w-56 xl:w-64 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-pointer',
          className,
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">{t('common.searchPlaceholder')}</span>
        <Shortcut keys={['mod', 'K']} className="tracking-normal" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>{t('common.searchHint')}</DialogTitle>
            <DialogDescription>{t('common.searchPlaceholder')}</DialogDescription>
          </DialogHeader>
          <DocsSearchPanel
            active={open}
            placeholder={t('common.searchPlaceholder')}
            emptyText={t('common.searchEmpty')}
            onSelect={entry => {
              setOpen(false);
              navigate(entry.path);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

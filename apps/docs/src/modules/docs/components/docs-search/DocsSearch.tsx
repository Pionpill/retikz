import type { FC } from 'react';

import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { Shortcut } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib';

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
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'size-7 cursor-pointer rounded-sm text-muted-foreground hover:text-foreground lg:hidden',
          className,
        )}
        onClick={() => setOpen(true)}
        aria-label={t('common.searchHint')}
        title={t('common.searchHint')}
      >
        <Search className="size-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={t('common.searchHint')}
        className={cn(
          'hidden w-48 cursor-pointer justify-start gap-2 bg-transparent text-muted-foreground hover:text-accent-foreground lg:inline-flex xl:w-64',
          className,
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">{t('common.searchPlaceholder')}</span>
        <Shortcut keys={['mod', 'K']} className="tracking-normal" />
      </Button>
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

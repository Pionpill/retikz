import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useTocStore } from '@/store/useTocStore';
import { Link as LinkIcon, TableOfContents } from 'lucide-react';
import { type FC, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const AppHeader: FC = () => {
  const { t } = useTranslation();
  const tocOpen = useTocStore(state => state.tocOpen);
  const setTocOpen = useTocStore(state => state.setTocOpen);

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard.writeText(window.location.href);
    toast.success(t('toc.linkCopied'));
  }, [t]);

  const handleToggleToc = useCallback(() => {
    setTocOpen(!tocOpen);
  }, [tocOpen, setTocOpen]);

  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="ml-auto flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="size-7 cursor-pointer rounded-sm"
          title={`${t('toc.copyLink')} (Ctrl+L)`}
          onClick={handleCopyLink}
        >
          <LinkIcon className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 cursor-pointer rounded-sm"
          title={`${tocOpen ? t('toc.hideOutline') : t('toc.showOutline')} (Ctrl+Alt+B)`}
          onClick={handleToggleToc}
        >
          <TableOfContents className="size-4" />
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;

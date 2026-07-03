import type { FC } from 'react';

import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';
import { AiChatTrigger } from '@/modules/docs/ai-chat';
import { DocsSearch } from '@/modules/docs/components/docs-search';
import { useLayoutStore } from '@/store';

import { BrandLink } from './BrandLink';
import { HeaderActions } from './HeaderActions';
import { MobileNav } from './MobileNav';
import { ModuleNav } from './ModuleNav';

/** 文档站顶栏。 */
export const AppHeader: FC = () => {
  const layout = useLayoutStore(s => s.layout);

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b bg-background/95 backdrop-blur">
      <div
        className={cn(
          '@container/header flex h-14 w-full items-center gap-3 px-4 @4xl/header:gap-6 @4xl/header:px-6',
          layout === 'centered' && 'mx-auto max-w-360',
        )}
      >
        <div className="flex min-w-0 flex-1 basis-0 items-center gap-3 @4xl/header:gap-6">
          <MobileNav />
          <BrandLink />
          <ModuleNav />
        </div>
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 @4xl/header:flex-1 @4xl/header:basis-0 @4xl/header:gap-1">
          <ButtonGroup>
            <AiChatTrigger />
            <DocsSearch />
          </ButtonGroup>
          <HeaderActions />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;

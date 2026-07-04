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
export const Header: FC = () => {
  const layout = useLayoutStore(s => s.layout);

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b bg-background/95 backdrop-blur">
      <div
        className={cn(
          'flex h-14 w-full items-center gap-3 px-4 lg:gap-6 lg:px-6',
          layout === 'centered' && 'mx-auto max-w-360',
        )}
      >
        <div className="flex min-w-0 flex-1 basis-0 items-center gap-3 lg:gap-6">
          <MobileNav />
          <BrandLink />
          <ModuleNav />
        </div>
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 lg:flex-1 lg:basis-0 lg:gap-1">
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

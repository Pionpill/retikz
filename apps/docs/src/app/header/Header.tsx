import type { FC } from 'react';

import { useLocation } from 'react-router';

import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib';
import { AiChatTrigger } from '@/modules/docs/ai-chat';
import { DocsSearch } from '@/modules/docs/components';
import { resolveDocNavigationContext } from '@/modules/docs/layout';
import { useLayoutStore } from '@/store';

import { HeaderActions } from './HeaderActions';
import { HeaderNavigation } from './HeaderNavigation';
import { MobileNav } from './MobileNav';

/** 文档站顶栏。 */
export const Header: FC = () => {
  const layout = useLayoutStore(s => s.layout);
  const { pathname } = useLocation();
  const navigation = resolveDocNavigationContext(pathname);

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b bg-background/95 backdrop-blur">
      <div
        className={cn(
          'flex h-14 w-full items-center gap-2 px-4 lg:gap-2 lg:px-6',
          layout === 'centered' && 'mx-auto max-w-360',
        )}
      >
        <div className="flex min-w-0 flex-1 basis-0 items-center gap-2 lg:gap-2">
          <MobileNav />
          <HeaderNavigation navigation={navigation} />
        </div>
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 lg:flex-1 lg:basis-0 lg:gap-2">
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

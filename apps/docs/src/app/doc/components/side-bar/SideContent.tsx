import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import useModule from '@/hooks/useModule';
import type { FC, PropsWithChildren } from 'react';
import { Fragment, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { cn } from '@/lib/utils';

const SideContent: FC<PropsWithChildren> = props => {
  const { children } = props;

  const [searchParams] = useSearchParams();
  const filePath = searchParams.get('path')!.split('/');
  const module = useModule();

  const getLabel = (value: string) => decodeURIComponent((value.split('_')[1] || value).split('.')[0]);
  // 目前仅支持一级目录
  const folderLink = useMemo(
    () => `/doc/${module}?path=${filePath.slice(0, -1).join('/')}/index.mdx`,
    [filePath, module],
  );

  const shownPath = useMemo(() => {
    return filePath[filePath.length - 1] === 'index.mdx' ? filePath.slice(0, -1) : filePath;
  }, [filePath]);

  return (
    <SidebarInset className="max-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b">
        <div className="flex items-center gap-2 px-4 w-full">
          <div className="h-4 flex-1 flex items-center">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {shownPath.map((item, index) => {
                  const isLast = index === shownPath.length - 1;
                  return (
                    <Fragment key={item}>
                      {index !== 0 ? <BreadcrumbSeparator className="hidden md:block" /> : null}
                      <BreadcrumbItem key={item} className={cn('hidden md:block', isLast && 'block')}>
                        {[0, shownPath.length - 1].includes(index) ? (
                          <BreadcrumbPage>{getLabel(item)}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={folderLink}>{getLabel(item)}</BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>
      {children}
    </SidebarInset>
  );
};

export default SideContent;

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
import useLang from '@/hooks/useLang';
import useModule from '@/hooks/useModule';
import { FC, Fragment, PropsWithChildren, useMemo } from 'react';
import { useLocation } from 'react-router';

const SideContent: FC<PropsWithChildren> = props => {
  const { children } = props;
  const { pathname } = useLocation();
  const filePath = pathname.split('/').slice(2);

  const { lang } = useLang();
  const module = useModule();

  const getLabel = (value: string) => value.split('_')[1].split('.')[0];
  const folderLink = useMemo(
    () => `/${lang}/${module}/${filePath.slice(0, -1).join('/')}/index.mdx`,
    [filePath, lang, module],
  );

  const shownPath = useMemo(() => {
    const realPath = filePath.slice(1);
    return realPath[realPath.length - 1] === 'index.mdx' ? realPath.slice(0, -1) : realPath;
  }, [filePath]);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {shownPath.map((item, index) => (
                <Fragment key={item}>
                  {index !== 0 ? <BreadcrumbSeparator className="hidden md:block" /> : null}
                  <BreadcrumbItem key={item} className="hidden md:block">
                    {index === shownPath.length - 1 ? (
                      <BreadcrumbPage>{getLabel(item)}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={folderLink}>{getLabel(item)}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="px-4">{children}</div>
    </SidebarInset>
  );
};

export default SideContent;

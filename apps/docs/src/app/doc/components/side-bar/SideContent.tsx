import { getReposCommitApi } from '@/api/github';
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
import { CalendarClock, CalendarPlus } from 'lucide-react';
import { FC, Fragment, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { moduleConfig } from '../../config/module';
import { useTranslation } from 'react-i18next';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

const SideContent: FC<PropsWithChildren> = props => {
  const { children } = props;

  const [searchParams] = useSearchParams();
  const filePath = searchParams.get('path')!.split('/');
  const module = useModule();
  const { lang } = useLang();
  const { t } = useTranslation();

  const [info, setInfo] = useState<{ createDate: Date; updateDate: Date } | null>(null);

  const getLabel = (value: string) => decodeURIComponent((value.split('_')[1] || value).split('.')[0]);
  // 目前仅支持一级目录
  const folderLink = useMemo(
    () => `/doc/${module}?path=${filePath.slice(0, -1).join('/')}/index.mdx`,
    [filePath, module],
  );

  const shownPath = useMemo(() => {
    return filePath[filePath.length - 1] === 'index.mdx' ? filePath.slice(0, -1) : filePath;
  }, [filePath]);

  useEffect(() => {
    getReposCommitApi(moduleConfig[module].repos, `doc/${lang}/${shownPath.join('/')}`).then(res =>
      setInfo({
        createDate: new Date(res[0].commit.author.date),
        updateDate: new Date(res[res.length - 1].commit.author.date),
      }),
    );
  }, [JSON.stringify(shownPath), module, lang]);

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
          {info ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2" title={t('doc.create')}>
                <CalendarPlus size={12} />
                <Typography variant="hint">{info.createDate.toLocaleDateString()}</Typography>
              </div>
              <div className="flex items-center gap-2" title={t('doc.update')}>
                <CalendarClock size={12} />
                <Typography variant="hint">{info.updateDate.toLocaleDateString()}</Typography>
              </div>
            </div>
          ) : null}
        </div>
      </header>
      {children}
    </SidebarInset>
  );
};

export default SideContent;

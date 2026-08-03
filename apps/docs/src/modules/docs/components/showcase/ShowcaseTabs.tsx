import type { FC, ReactNode } from 'react';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useSearchParams } from 'react-router';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSectionsByModule } from '@/modules/docs/data';

import { ComponentPreview, DemoLocationContext } from '../component-preview';
import { collectShowcasePages } from './collect-showcase-pages';

export type ShowcaseTabsProps = {
  /** 当前 Type 人工策展的同类示例 */
  examples: ReactNode;
  /** 由页面 MDX 管线解析的高层 API 内容 */
  children: ReactNode;
};

type ShowcaseTab = 'examples' | 'family' | 'api';

const SHOWCASE_TABS = new Set<ShowcaseTab>(['examples', 'family', 'api']);

/** 把 URL 外部输入收窄为稳定的 Showcase tab */
const normalizeShowcaseTab = (value: string | null): ShowcaseTab =>
  value !== null && SHOWCASE_TABS.has(value as ShowcaseTab) ? (value as ShowcaseTab) : 'examples';

/** Showcase 页面固定的 Examples / Family / API 导航 */
export const ShowcaseTabs: FC<ShowcaseTabsProps> = props => {
  const { examples, children } = props;
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = normalizeShowcaseTab(searchParams.get('tab'));
  const moduleId = pathname.split('/').filter(Boolean)[0] ?? '';

  const familyPages = useMemo(() => {
    if (!moduleId) return [];
    const pages = collectShowcasePages(moduleId, getSectionsByModule(moduleId));
    const current = pages.find(page => page.path.toLowerCase() === pathname.toLowerCase());
    if (!current) return [];

    return pages.filter(
      page =>
        page.path !== current.path &&
        page.metadata.family === current.metadata.family &&
        page.metadata.role === 'primary',
    );
  }, [moduleId, pathname]);

  const handleTabChange = (value: string): void => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', normalizeShowcaseTab(value));
    setSearchParams(next, { replace: true });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-10 gap-0">
      <div className="w-full overflow-x-auto">
        <TabsList className="min-w-max">
          <TabsTrigger value="examples">{t('common.showcaseExamples')}</TabsTrigger>
          <TabsTrigger value="family">{t('common.showcaseFamily')}</TabsTrigger>
          <TabsTrigger value="api">{t('common.showcaseApi')}</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="examples" className="pt-8">
        {examples}
      </TabsContent>
      <TabsContent value="family" className="pt-8">
        {familyPages.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            {t('common.showcaseFamilyEmpty')}
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {familyPages.map(page => (
              <section key={page.path}>
                <h2 className="mb-4 text-xl font-medium tracking-tight">
                  <Link className="underline-offset-4 hover:underline" to={page.path}>
                    {t(page.label)}
                  </Link>
                </h2>
                <DemoLocationContext.Provider value={page.segments}>
                  <ComponentPreview
                    files={page.metadata.preview}
                    controls={{ name: page.metadata.preview }}
                    size="xl"
                  />
                </DemoLocationContext.Provider>
              </section>
            ))}
          </div>
        )}
      </TabsContent>
      <TabsContent value="api" className="pt-8">
        {children}
      </TabsContent>
    </Tabs>
  );
};

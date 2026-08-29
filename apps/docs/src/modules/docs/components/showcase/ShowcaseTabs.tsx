import type { FC, ReactNode } from 'react';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useSearchParams } from 'react-router';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSectionsByModule } from '@/modules/docs/data';

import type { ShowcasePageEntry } from './types';

import { ComponentPreviewThumbnail, DemoLocationContext } from '../component-preview';
import { MarkdownInline } from '../inline-markdown';
import { collectShowcasePages } from './collect-showcase-pages';
import { useShowcasePageDescription } from './hooks';

export type ShowcaseTabsProps = {
  /** 当前 Type 人工策展的同类示例 */
  examples: ReactNode;
  /** 由页面 MDX 管线解析的高层 API 内容 */
  children: ReactNode;
};

type ShowcaseTab = 'examples' | 'family' | 'api';

const SHOWCASE_TABS = new Set<ShowcaseTab>(['examples', 'family', 'api']);

type ShowcaseFamilyCardProps = {
  page: ShowcasePageEntry;
};

/** 同类图表的静态缩略图卡片 */
const ShowcaseFamilyCard: FC<ShowcaseFamilyCardProps> = props => {
  const { page } = props;
  const { t } = useTranslation();
  const description = useShowcasePageDescription(page.segments);

  return (
    <Link
      to={page.path}
      data-slot="showcase-family-card"
      className="flex h-[250px] flex-col overflow-hidden rounded-xl border bg-transparent text-left transition-[border-color,box-shadow] hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <DemoLocationContext.Provider value={page.segments}>
        <ComponentPreviewThumbnail
          files={page.metadata.preview}
          className="h-[150px] shrink-0 border-b bg-transparent"
        />
      </DemoLocationContext.Provider>
      <span data-slot="showcase-family-copy" className="block min-h-0 flex-1 bg-muted/40 p-4">
        <span className="block font-medium text-foreground">{t(page.label)}</span>
        {description && (
          <MarkdownInline source={description} className="mt-1.5 block text-sm leading-relaxed text-muted-foreground" />
        )}
      </span>
    </Link>
  );
};

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
    const normalized = normalizeShowcaseTab(value);
    if (normalized === 'examples') next.delete('tab');
    else next.set('tab', normalized);
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
          <div data-slot="showcase-family" className="grid grid-cols-[repeat(auto-fill,minmax(230px,270px))] gap-4">
            {familyPages.map(page => (
              <ShowcaseFamilyCard key={page.path} page={page} />
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

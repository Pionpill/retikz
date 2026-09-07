import type { FC, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { ComponentPreviewProps } from '../component-preview';

import { ComponentPreview, DemoLocationContext } from '../component-preview';

export type ModuleLandingDemo = {
  /** 演示卡的稳定标识。 */
  id: string;
  /** 演示在落地页网格中的展示密度。 */
  layout: 'compact' | 'wide' | 'feature' | 'full';
  /** ComponentPreview 解析 demo 所需的文档路径片段。 */
  location: Array<string>;
  /** ComponentPreview 配置。 */
  preview: ComponentPreviewProps;
};

export type ModuleLandingPageProps = {
  /** 页面顶部的小号定位文本。 */
  eyebrow?: string;
  /** 页面主标题。 */
  title: string;
  /** 页面主说明。 */
  description: string;
  /** 模块入口区域的无障碍标签。 */
  navigationLabel?: string;
  /** 标题下方的模块入口内容，由页面按自身模块组合。 */
  navigation?: ReactNode;
  /** 页面中的真实能力演示。 */
  demos: ReadonlyArray<ModuleLandingDemo>;
  /** 页面底部说明。 */
  footer: ReactNode;
};

/** 由介绍、模块入口、能力演示和底部说明组成的可复用落地页。 */
export const ModuleLandingPage: FC<ModuleLandingPageProps> = props => {
  const { eyebrow, title, description, navigationLabel, navigation, demos, footer } = props;

  return (
    <main data-slot="module-landing-page" className="flex min-h-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[1650px] flex-1 flex-col px-6 pt-20 pb-8">
        <div className="flex-1">
          <section data-slot="module-landing-hero" className="mx-auto max-w-5xl text-center">
            {eyebrow ? (
              <p data-slot="module-landing-eyebrow" className="text-sm font-medium text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h1 className={cn('text-5xl font-bold tracking-tight text-balance', eyebrow && 'mt-4')}>{title}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
              {description}
            </p>
          </section>

          {navigation ? (
            <nav
              data-slot="module-landing-navigation"
              aria-label={navigationLabel}
              className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-center gap-2"
            >
              {navigation}
            </nav>
          ) : null}

          <section data-slot="module-landing-demos" className="mt-24">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
              {demos.map(demo => (
                <article
                  key={demo.id}
                  data-slot="module-landing-demo"
                  className={cn(
                    '[&>div]:!my-0 [&>div>div]:shadow-sm',
                    demo.layout === 'compact' && 'lg:col-span-2',
                    demo.layout === 'wide' && 'sm:col-span-2 lg:col-span-3',
                    demo.layout === 'feature' && 'sm:col-span-2 lg:col-span-4',
                    demo.layout === 'full' && 'sm:col-span-2 lg:col-span-6',
                  )}
                >
                  <DemoLocationContext.Provider value={demo.location}>
                    <ComponentPreview
                      {...demo.preview}
                      previewClassName={cn('!p-0 sm:!p-0', demo.preview.previewClassName)}
                    />
                  </DemoLocationContext.Provider>
                </article>
              ))}
            </div>
          </section>
        </div>

        <footer data-slot="module-landing-footer" className="mt-8 pt-4 text-center text-sm text-muted-foreground">
          {footer}
        </footer>
      </div>
    </main>
  );
};

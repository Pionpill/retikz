import type { FC, ReactNode } from 'react';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ComponentPreviewProps } from '../component-preview';

import { ComponentPreview, ComponentPreviewThumbnail } from '../component-preview';
import { ShowcaseTabs } from './ShowcaseTabs';

export type ShowcaseExample = {
  /** 页面内稳定的示例标识 */
  id: string;
  /** 示例卡片标题 */
  title: string;
  /** 示例卡片单句说明 */
  description: string;
  /** 选中后交给完整 ComponentPreview 的配置 */
  preview: ComponentPreviewProps;
};

export type ShowcaseGalleryProps = {
  /** 当前 Type 人工策展的示例；第一项是 canonical 默认值 */
  examples: readonly [ShowcaseExample, ...Array<ShowcaseExample>];
  /** 由页面 MDX 管线解析的高层 API 内容 */
  children: ReactNode;
};

/** 单一完整 Preview 与轻量 Example 网格组成的 Showcase 主体 */
export const ShowcaseGallery: FC<ShowcaseGalleryProps> = props => {
  const { examples, children } = props;
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState(examples[0].id);
  const selected = examples.find(example => example.id === selectedId) ?? examples[0];
  const availableExamples = examples.filter(example => example.id !== selected.id);

  return (
    <>
      <div aria-label={selected.title}>
        <ComponentPreview key={selected.id} {...selected.preview} />
      </div>

      <ShowcaseTabs
        examples={
          availableExamples.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              {t('common.showcaseExamplesEmpty')}
            </p>
          ) : (
            <div data-slot="showcase-examples" className="grid grid-cols-[repeat(auto-fill,minmax(230px,270px))] gap-4">
              {availableExamples.map(example => (
                <button
                  key={example.id}
                  type="button"
                  data-slot="showcase-example"
                  onClick={() => setSelectedId(example.id)}
                  className="flex h-[250px] flex-col overflow-hidden rounded-xl border bg-transparent text-left transition-[border-color,box-shadow] hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <ComponentPreviewThumbnail
                    files={example.preview.files}
                    className="h-[150px] shrink-0 border-b bg-transparent"
                  />
                  <span data-slot="showcase-example-copy" className="block min-h-0 flex-1 bg-muted/40 p-4">
                    <span className="block font-medium text-foreground">{example.title}</span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                      {example.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )
        }
      >
        {children}
      </ShowcaseTabs>
    </>
  );
};

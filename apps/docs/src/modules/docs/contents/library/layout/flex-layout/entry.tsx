import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { createLayoutPreviewSource } from '@/modules/docs/preview';

import { entryI18n } from './entry.i18n';

export type EntryProps = { lang?: Lang };

/** 展示固定项与不同伸展权重的空间分配 */
const renderPreview = (inspecting: boolean, lang: Lang = 'zh') => {
  const text = entryI18n[lang];

  return (
    <Layout viewBox={{ x: -20, y: -20, width: 600, height: 108 }}>
      <FlexLayout
        size={{ x: { kind: 'fixed', value: 560 }, y: { kind: 'content' } }}
        padding={16}
        gap={12}
        alignItems="center"
      >
        <FlexLayoutItem itemKey="fixed" basis={100} grow={0} shrink={0}>
          <Node text={text.fixed} />
        </FlexLayoutItem>
        <FlexLayoutItem itemKey="grow-1" basis={100} grow={1}>
          <Node text={text.growOne} style={{ stroke: 'dodgerblue' }} />
        </FlexLayoutItem>
        <FlexLayoutItem itemKey="grow-2" basis={100} grow={2}>
          <Node text={text.growTwo} style={{ stroke: 'dodgerblue' }} />
        </FlexLayoutItem>
      </FlexLayout>
    </Layout>
  );
};

export const previewSource = createLayoutPreviewSource(lang => renderPreview(false, lang));

const Example: FC<EntryProps> = props => renderPreview(true, props.lang);

export default Example;

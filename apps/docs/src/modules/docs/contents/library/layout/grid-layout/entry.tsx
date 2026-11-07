import { GridLayoutItem, GridLayout } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { createLayoutPreviewSource } from '@/modules/docs/preview';

import { entryI18n } from './entry.i18n';

export type EntryProps = { lang?: Lang };

/** 展示共享列轨道与跨列子项 */
const renderPreview = (lang: Lang = 'zh') => {
  const text = entryI18n[lang];
  return (
    <Layout viewBox={{ x: -20, y: -20, width: 600, height: 184 }}>
      <GridLayout
        size={{ x: { kind: 'fixed', value: 560 }, y: { kind: 'content' } }}
        columns={[
          { kind: 'fixed', value: 100 },
          { kind: 'fraction', factor: 1 },
          { kind: 'fraction', factor: 2 },
        ]}
        rows={[
          { kind: 'content', mode: 'natural' },
          { kind: 'content', mode: 'natural' },
        ]}
        padding={16}
        columnGap={12}
        rowGap={12}
        justifyItems="center"
        alignItems="center"
      >
        <GridLayoutItem itemKey="heading" column={{ span: 3 }}>
          <Node text={text.heading} style={{ stroke: 'dodgerblue' }} />
        </GridLayoutItem>
        <GridLayoutItem itemKey="fixed">
          <Node text={text.fixed} />
        </GridLayoutItem>
        <GridLayoutItem itemKey="one">
          <Node text={text.one} />
        </GridLayoutItem>
        <GridLayoutItem itemKey="two">
          <Node text={text.two} />
        </GridLayoutItem>
      </GridLayout>
    </Layout>
  );
};

export const previewSource = createLayoutPreviewSource(lang => <Layout {...renderPreview(lang).props} />);

const Example: FC<EntryProps> = props => renderPreview(props.lang);

export default Example;

import { OverlayLayout, OverlayLayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { createLayoutPreviewSource } from '@/modules/docs/preview';

import { entryI18n } from './entry.i18n';

export type EntryProps = { lang?: Lang };

/** 展示居中内容与独立定位的前景徽标 */
const renderPreview = (inspecting: boolean, lang: Lang = 'zh') => {
  const text = entryI18n[lang];

  return (
    <Layout viewBox={{ x: -20, y: -20, width: 400, height: 184 }}>
      <OverlayLayout
        size={{ x: { kind: 'fixed', value: 360 }, y: { kind: 'fixed', value: 144 } }}
        padding={16}
        justifyItems="center"
        alignItems="center"
      >
        <OverlayLayoutItem itemKey="card" zIndex={0}>
          <Node
            text={text.card}
            layout={{ minimumSize: { width: 240, height: 88 } }}
            style={{ stroke: 'gray', fill: 'none' }}
          />
        </OverlayLayoutItem>
        <OverlayLayoutItem
          itemKey="badge"
          placement={{ kind: 'positioned', at: { x: 280, y: 18 }, anchor: { x: 0.5, y: 0.5 } }}
          sizeParticipation="exclude"
          zIndex={1}
        >
          <Node
            text="3"
            shape="circle"
            layout={{ minimumSize: 36 }}
            style={{ stroke: 'dodgerblue', fill: 'dodgerblue', textColor: 'contrast' }}
          />
        </OverlayLayoutItem>
      </OverlayLayout>
    </Layout>
  );
};

export const previewSource = createLayoutPreviewSource(lang => renderPreview(false, lang));

const Example: FC<EntryProps> = props => renderPreview(true, props.lang);

export default Example;

import { OverlayLayout, OverlayLayoutItem } from '@retikz/layout-react';
import { OVERLAY_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { defineOverlayPreview } from '../preview';
import { createPreviewControlContract, previewControlContract } from './overlay-participation.controls';
import { demoI18n } from './overlay-participation.i18n';

export { createPreviewControlContract } from './overlay-participation.controls';
export const previewControls = previewControlContract.controls;
const createPreview = (lang: Lang) =>
  defineOverlayPreview(
    createPreviewControlContract(lang),
    values => (
      <Layout>
        <OverlayLayout padding={12} justifyItems="start" alignItems="start">
          <OverlayLayoutItem itemKey="first">
            <Node
              text={[{ runs: [{ text: `${demoI18n[lang].first} · z:0`, fill: '#153b60' }] }]}
              layout={{ minimumSize: { width: 140, height: 60 } }}
              style={{ stroke: 'dodgerblue', fill: '#dceeff' }}
            />
          </OverlayLayoutItem>
          <OverlayLayoutItem
            itemKey="second"
            sizeParticipation={values.participation}
            zIndex={values.zIndex}
            offset={{ x: values.offsetX, y: values.offsetY }}
          >
            <Node
              text={[{ runs: [{ text: `${demoI18n[lang].second} · z:${values.zIndex}`, fill: '#653b0c' }] }]}
              layout={{ minimumSize: { width: 220, height: 100 } }}
              style={{ stroke: 'darkorange', fill: '#ffe4bd' }}
            />
          </OverlayLayoutItem>
        </OverlayLayout>
      </Layout>
    ),
    () => ({
      rules: [
        {
          kind: 'request',
          inspector: OVERLAY_LAYOUT_INSPECTOR_KEY,
          target: { kind: 'scene' },
          options: {
            bounds: { container: true, content: false, slot: false, allocation: false, visual: false },
            spacing: false,
            overflow: false,
            anchors: false,
            placements: false,
            stacking: false,
            alignmentGuides: false,
          },
        },
      ],
    }),
  );
const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource: typeof previews.zh.source = {
  buildViews: context => previews[context.lang].source.buildViews!(context),
};
/** 示例语言 */
export type DemoProps = { lang?: Lang };
/** 本节 API 的交互示例，所有入口共享场景与检查配置 */
const Demo: FC<DemoProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;

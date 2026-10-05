import { OverlayLayout, OverlayLayoutItem } from '@retikz/layout-react';
import { OVERLAY_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { defineOverlayPreview } from '../preview';
import { createPreviewControlContract, previewControlContract } from './overlay-alignment.controls';
import { demoI18n } from './overlay-alignment.i18n';

export { createPreviewControlContract } from './overlay-alignment.controls';
export const previewControls = previewControlContract.controls;

const createPreview = (lang: Lang) =>
  defineOverlayPreview(
    createPreviewControlContract(lang),
    values => (
      <Layout>
        <OverlayLayout
          size={{ x: { kind: 'fixed', value: 300 }, y: { kind: 'fixed', value: 150 } }}
          padding={12}
          justifyItems={values.justifyItems}
        >
          <OverlayLayoutItem alignSelf="start">
            <Node text={demoI18n[lang].follower} style={{ stroke: 'dodgerblue' }} />
          </OverlayLayoutItem>
          <OverlayLayoutItem
            alignSelf="end"
            {...(values.justifySelf === 'auto' ? {} : { justifySelf: values.justifySelf })}
          >
            <Node
              text={values.justifySelf === 'auto' ? demoI18n[lang].follower : demoI18n[lang].overridden}
              style={{ stroke: 'darkorange' }}
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

import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { InspectFlexLayout, LayoutInspectLayout } from '@retikz/layout-react/inspect';
import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { createLayoutInspectPreviewSource } from '@/modules/docs/preview';

import { entryI18n } from './entry.i18n';

export type EntryProps = { lang?: Lang };

const inspectOptions = {
  bounds: { container: true, content: false, slot: true, allocation: false, visual: false },
  spacing: { padding: true, margin: false },
  lines: false,
  gaps: true,
  alignmentGuides: false,
};

/** 展示固定项与不同伸展权重的空间分配 */
const renderPreview = (inspecting: boolean, lang: Lang = 'zh') => {
  const text = entryI18n[lang];
  const PreviewLayout = inspecting ? LayoutInspectLayout : Layout;
  const Container = inspecting ? InspectFlexLayout : FlexLayout;
  return (
    <PreviewLayout viewBox={{ x: -20, y: -20, width: 600, height: 108 }}>
      <Container
        size={{ x: { kind: 'fixed', value: 560 }, y: { kind: 'content' } }}
        padding={16}
        gap={12}
        alignItems="center"
        {...(inspecting
          ? {
              inspect: inspectOptions,
            }
          : {})}
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
      </Container>
    </PreviewLayout>
  );
};
export const previewSource = createLayoutInspectPreviewSource(lang => renderPreview(false, lang), {
  rules: [
    { kind: 'request', inspector: FLEX_LAYOUT_INSPECTOR_KEY, target: { kind: 'scene' }, options: inspectOptions },
  ],
});

const Example: FC<EntryProps> = props => renderPreview(true, props.lang);

export default Example;

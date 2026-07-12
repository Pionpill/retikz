import type { ReactNode } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { ComponentPreviewCardProps } from '../../src/modules/docs/components/component-preview/ComponentPreviewCard';
import type { PreviewControlRuntime } from '../../src/modules/docs/components/component-preview/types';

import i18n from '../../src/i18n';
import * as componentPreviewExports from '../../src/modules/docs/components/component-preview';
import { ComponentPreview } from '../../src/modules/docs/components/component-preview/ComponentPreview';
import { DemoLocationContext } from '../../src/modules/docs/components/component-preview/context';
import { PreviewControlSlotLayer } from '../../src/modules/docs/components/component-preview/preview-panel';

const capture = vi.hoisted(() => {
  let props: ComponentPreviewCardProps | null = null;
  return {
    set: (next: ComponentPreviewCardProps) => {
      props = next;
    },
    reset: () => {
      props = null;
    },
    read: (): ComponentPreviewCardProps => {
      if (props === null) throw new Error('ComponentPreviewCard props were not captured.');
      return props;
    },
  };
});
const previewControlRuntime: PreviewControlRuntime = {
  remount: () => undefined,
  rendererMode: 'svg',
  renderPane: null,
  hovered: false,
  pinned: true,
  expanded: false,
  active: () => false,
  setActive: () => undefined,
  value: () => undefined,
  setValue: () => undefined,
};

vi.mock('../../src/modules/docs/components/component-preview/ComponentPreviewCard', () => ({
  ComponentPreviewCard: (props: ComponentPreviewCardProps) => {
    capture.set(props);
    return null;
  },
}));

vi.mock('../../src/modules/docs/layout', () => ({
  docPathSegments: () => ['kernel', 'components', 'test'],
  useDocLocation: () => ({ moduleId: 'kernel', sectionId: 'components', pageId: 'test' }),
}));

beforeAll(async () => {
  await i18n.changeLanguage('zh');
});

const renderPreview = (segments: Array<string>, node: ReactNode): ComponentPreviewCardProps => {
  capture.reset();
  renderToStaticMarkup(<DemoLocationContext.Provider value={segments}>{node}</DemoLocationContext.Provider>);
  return capture.read();
};

describe('ComponentPreview Vanilla source', () => {
  it('不再从组件预览根 barrel 暴露旧卡片入口', () => {
    expect(componentPreviewExports).not.toHaveProperty(['Component', 'Render'].join(''));
  });

  it('Tier 2 composite 不生成自动 Vanilla 视图', () => {
    const props = renderPreview(['viz', 'components', 'plot'], <ComponentPreview files="plot-coordinate" />);

    expect(props.source?.vanilla).toBeUndefined();
  });

  it('Tier 2 composite 仍允许显式 Vanilla override', () => {
    const props = renderPreview(['viz', 'get-start'], <ComponentPreview files="line-scatter" />);

    expect(props.source?.vanilla?.files[0].filename).toBe('line-scatter.vanilla.ts');
  });

  it('没有 alternate render 的 Vanilla view 不声明固定 renderer', () => {
    const props = renderPreview(
      ['kernel', 'components', 'extend', 'custom-animation'],
      <ComponentPreview files="custom-property" />,
    );

    expect(props.source?.vanilla?.files[0].filename).toBe('custom-property.vanilla.ts');
    expect(props.source?.vanilla?.render).toBeUndefined();
    expect(props.source?.vanilla?.rendererMode).toBeUndefined();
  });
});

describe('ComponentPreview localized controls', () => {
  it('将 previewClassName 透传给卡片且不再传旧名称', () => {
    const props = renderPreview(
      ['viz', 'grammar', 'mark', 'path'],
      <ComponentPreview files="line-basic" previewClassName="outer-preview-class" />,
    );

    expect(props).toHaveProperty('previewClassName', 'outer-preview-class');
    expect(props).not.toHaveProperty(['component', 'ClassName'].join(''));
    expect(props).not.toHaveProperty(['render', 'AsComponent'].join(''));
    expect(props).not.toHaveProperty('interactive');
  });

  it('动画控制定义先于自定义控制定义', () => {
    const props = renderPreview(
      ['viz', 'grammar', 'mark', 'path'],
      <ComponentPreview
        files="line-basic"
        replayable
        controlSlots={[
          {
            id: 'custom-control',
            render: () => <button aria-label="Custom control" />,
          },
        ]}
      />,
    );
    const markup = renderToStaticMarkup(
      <PreviewControlSlotLayer slots={props.controlSlots ?? []} pinned runtime={previewControlRuntime} />,
    );

    expect(markup.indexOf('aria-label="Replay"')).toBeGreaterThanOrEqual(0);
    expect(markup.indexOf('aria-label="Custom control"')).toBeGreaterThan(markup.indexOf('aria-label="Replay"'));
  });

  it('英文页面使用英文声明式 controls', async () => {
    await i18n.changeLanguage('en');

    try {
      const props = renderPreview(
        ['viz', 'grammar', 'mark', 'path'],
        <ComponentPreview files={{ file: 'line-curve' }} />,
      );
      const control = props.controlSlots?.[0];

      expect(control).toBeDefined();
      const markup = renderToStaticMarkup(control?.render(previewControlRuntime));
      expect(markup).toContain('aria-label="Connection"');
      expect(markup).toContain('Linear');
      expect(markup).not.toContain('连接方式');
    } finally {
      await i18n.changeLanguage('zh');
    }
  });

  it('英文页面可显式复用另一个 demo 的英文 controls', async () => {
    await i18n.changeLanguage('en');

    try {
      const props = renderPreview(
        ['viz', 'grammar', 'mark', 'path'],
        <ComponentPreview files="line-basic" controlsName="line-curve" />,
      );
      const control = props.controlSlots?.[0];

      expect(control).toBeDefined();
      const markup = renderToStaticMarkup(control?.render(previewControlRuntime));
      expect(markup).toContain('aria-label="Connection"');
      expect(markup).not.toContain('连接方式');
    } finally {
      await i18n.changeLanguage('zh');
    }
  });
});

describe('ComponentPreview files source', () => {
  it('将主文件对象的 diffFrom 用作 React 主源码 baseline', () => {
    const props = renderPreview(
      ['kernel', 'examples', 'learning-path'],
      <ComponentPreview files={{ file: 'learning-path-02-spine', diffFrom: 'learning-path-01-title' }} />,
    );

    expect(props.name).toBe('learning-path-02-spine');
    expect(props.source?.react?.files[0]).toMatchObject({
      isMain: true,
      filename: 'learning-path-02-spine.demo.tsx',
    });
    expect(props.source?.react?.files[0].diff).toBeDefined();
  });

  it('将附加文件对象的 diffFrom 用作该文件自己的 baseline', () => {
    const props = renderPreview(
      ['kernel', 'examples', 'ohms-law-circuit'],
      <ComponentPreview
        files={[
          { file: 'circuit-01-meters' },
          { file: 'circuit-01-meters.meter.tsx', diffFrom: 'circuit-01-meters.meter.tsx' },
        ]}
      />,
    );

    expect(props.source?.react?.files[1]).toMatchObject({
      filename: 'circuit-01-meters.meter.tsx',
    });
    expect(props.source?.react?.files[1].diff).toBeDefined();
  });

  it('主文件有 baseline 时继续为同前缀附加文件推导 baseline 文件名', () => {
    const props = renderPreview(
      ['kernel', 'examples', 'ohms-law-circuit'],
      <ComponentPreview
        files={[{ file: 'circuit-01-meters', diffFrom: 'circuit-01-meters' }, { file: 'circuit-01-meters.meter.tsx' }]}
      />,
    );

    expect(props.source?.react?.files[1].diff).toBeDefined();
  });
});

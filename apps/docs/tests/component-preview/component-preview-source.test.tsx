import type { ReactNode } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { ComponentRenderProps } from '../../src/modules/docs/components/component-preview/ComponentRender';
import type { PreviewControlRuntime } from '../../src/modules/docs/components/component-preview/types';

import i18n from '../../src/i18n';
import { ComponentPreview } from '../../src/modules/docs/components/component-preview/ComponentPreview';
import { DemoLocationContext } from '../../src/modules/docs/components/component-preview/context';

const capture = vi.hoisted(() => {
  let props: ComponentRenderProps | null = null;
  return {
    set: (next: ComponentRenderProps) => {
      props = next;
    },
    reset: () => {
      props = null;
    },
    read: (): ComponentRenderProps => {
      if (props === null) throw new Error('ComponentRender props were not captured.');
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

vi.mock('../../src/modules/docs/components/component-preview/ComponentRender', () => ({
  ComponentRender: (props: ComponentRenderProps) => {
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

const renderPreview = (segments: Array<string>, node: ReactNode): ComponentRenderProps => {
  capture.reset();
  renderToStaticMarkup(<DemoLocationContext.Provider value={segments}>{node}</DemoLocationContext.Provider>);
  return capture.read();
};

describe('ComponentPreview Vanilla source', () => {
  it('Tier 2 composite 不生成自动 Vanilla 视图', () => {
    const props = renderPreview(['viz', 'components', 'plot'], <ComponentPreview name="plot-coordinate" />);

    expect(props.source?.vanilla).toBeUndefined();
  });

  it('Tier 2 composite 仍允许显式 Vanilla override', () => {
    const props = renderPreview(['viz', 'get-start'], <ComponentPreview name="line-scatter" />);

    expect(props.source?.vanilla?.files[0].filename).toBe('line-scatter.vanilla.ts');
  });
});

describe('ComponentPreview localized controls', () => {
  it('英文页面使用英文声明式 controls', async () => {
    await i18n.changeLanguage('en');

    try {
      const props = renderPreview(
        ['viz', 'grammar', 'mark', 'path'],
        <ComponentPreview name="line-curve" interactive />,
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
        <ComponentPreview name="line-basic" controlsName="line-curve" interactive />,
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

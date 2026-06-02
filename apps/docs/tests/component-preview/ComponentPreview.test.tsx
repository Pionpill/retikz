import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';

import i18n from '@/i18n';
import { ComponentPreview } from '@/components/shared/component-preview/ComponentPreview';
import { DemoLocationContext } from '@/components/shared/component-preview/demoLocationContext';

/**
 * 切页失步误报回归：旧 MDX 内容在过渡窗口里仍挂载，而实时路由已指向新页。
 * ComponentPreview 必须按"内容所属页面"(DemoLocationContext)解析 demo 目录，而非实时路由，
 * 否则旧 demo 名会被拼到新页目录下 → 短暂 "Demo not found"。
 *
 * 用一个不存在的 demo 名走 "not found" 纯文本分支（不触发 retikz 渲染），
 * 报错文案里的目录即暴露 ComponentPreview 实际用了哪份 segments。
 */
beforeAll(async () => {
  await i18n.changeLanguage('zh');
});

const MISSING = '__nonexistent_demo_for_test__';

const renderAtRoute = (path: string, node: ReactNode): string =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path=":moduleId/:sectionId/:pageId" element={node} />
      </Routes>
    </MemoryRouter>,
  );

describe('ComponentPreview demo 目录解析（切页失步回归）', () => {
  it('无 DemoLocationContext 时按实时路由目录解析（基线）', () => {
    const html = renderAtRoute('/core/components/pageA', <ComponentPreview name={MISSING} />);
    expect(html).toContain(`contents/core/components/pageA/${MISSING}.demo.tsx`);
  });

  it('有 DemoLocationContext 时优先用配对 segments，即便实时路由已是新页', () => {
    const html = renderAtRoute(
      '/core/components/pageA',
      <DemoLocationContext.Provider value={['core', 'components', 'pageB']}>
        <ComponentPreview name={MISSING} />
      </DemoLocationContext.Provider>,
    );
    // 内容属于 pageB、路由已切到 pageA：目录必须取 context 的 pageB
    expect(html).toContain(`contents/core/components/pageB/${MISSING}.demo.tsx`);
    expect(html).not.toContain(`contents/core/components/pageA/${MISSING}.demo.tsx`);
  });
});

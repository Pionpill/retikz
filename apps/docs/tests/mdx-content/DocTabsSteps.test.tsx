// @vitest-environment jsdom
import { run } from '@mdx-js/mdx';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';
import * as jsxRuntime from 'react/jsx-runtime';
import { afterEach, describe, expect, it } from 'vitest';

import { compileMdx } from '@/modules/docs/components/mdx-content/compile';
import { DocStep, DocSteps } from '@/modules/docs/components/mdx-content/doc-steps';
import { DocTab, DocTabs } from '@/modules/docs/components/mdx-content/doc-tabs';
import { DocHostContext } from '@/modules/docs/components/mdx-content/doc-tabs/context';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const roots: Array<Root> = [];
const render = async (children: ReactNode) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  await act(() => root.render(children));
  return container;
};
const selectTab = async (container: Element, label: string) => {
  const button = Array.from(container.querySelectorAll('[role="tab"]')).find(item => item.textContent === label);
  if (!button) throw new Error('Missing tab: ' + label);
  await act(() => {
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
  });
};
afterEach(async () => {
  for (const root of roots.splice(0)) await act(() => root.unmount());
  document.body.replaceChildren();
});

describe('MDX DocTabs / DocSteps', () => {
  it('使用 shadcn 默认标签外观', async () => {
    const container = await render(
      <DocTabs defaultValue="react">
        <DocTab value="react" label="React">
          React body
        </DocTab>
        <DocTab value="vanilla" label="Vanilla">
          Vanilla body
        </DocTab>
      </DocTabs>,
    );

    const tabsList = container.querySelector('[role="tablist"]');
    const trigger = container.querySelector('[role="tab"]');
    expect(tabsList?.getAttribute('data-variant')).toBe('default');
    expect(trigger?.className).not.toContain('rounded-none');
  });

  it('整篇编译保留步骤内 Markdown、代码缩进、反斜杠与自定义组件，切换后显示另一分支', async () => {
    const code = "const formula = '\\\\frac{a}{b}';\n  render(formula);";
    const source = [
      '<DocTabs defaultValue="a">',
      '<DocTab value="a" label="Alpha">',
      '<DocSteps>',
      '<DocStep title="First">',
      '',
      'Read **bold** and `inline` with [a link](/guide).',
      '',
      '- One',
      '- Two',
      '',
      '```ts',
      code,
      '```',
      '',
      '<Notice />',
      '',
      '</DocStep>',
      '<DocStep title="Second">',
      '',
      'Next paragraph.',
      '',
      '</DocStep>',
      '</DocSteps>',
      '</DocTab>',
      '<DocTab value="b" label="Beta">',
      '',
      'Other branch.',
      '',
      '</DocTab>',
      '</DocTabs>',
    ].join('\n');
    const compiled = await compileMdx(source);
    const { default: Content } = await run(compiled, { ...jsxRuntime, ...jsxDevRuntime });
    const container = await render(
      <Content components={{ DocTabs, DocTab, DocSteps, DocStep, Notice: () => <aside>Notice body</aside> }} />,
    );
    const panel = container.querySelector('[role="tabpanel"][data-state="active"]');
    expect(panel?.querySelectorAll('ol > li')).toHaveLength(2);
    expect(panel?.querySelector('strong')?.textContent).toBe('bold');
    expect(panel?.querySelector('a')?.getAttribute('href')).toBe('/guide');
    expect(panel?.querySelectorAll('ul > li')).toHaveLength(2);
    expect(panel?.querySelector('pre code')?.textContent).toBe(code + '\n');
    expect(panel?.querySelector('aside')?.textContent).toBe('Notice body');
    await selectTab(container, 'Beta');
    expect(container.querySelector('[role="tabpanel"][data-state="active"]')?.textContent).toContain('Other branch.');
    expect(container.textContent).not.toContain('Notice body');
  });

  it('React / Vanilla 共享文档选择，普通方案仍按自身默认值独立切换', async () => {
    const Host = () => {
      const [host, setHost] = useState<'react' | 'vanilla'>('vanilla');
      return (
        <DocHostContext.Provider value={{ host, setHost }}>
          {[0, 1].map(index => (
            <section key={index} data-host-tabs>
              <DocTabs defaultValue="react">
                <DocTab value="react" label="React">
                  React body
                </DocTab>
                <DocTab value="vanilla" label="Vanilla">
                  Vanilla body
                </DocTab>
              </DocTabs>
            </section>
          ))}
          <section data-independent>
            <DocTabs defaultValue="svg">
              <DocTab value="svg" label="SVG">
                SVG body
              </DocTab>
              <DocTab value="canvas" label="Canvas">
                Canvas body
              </DocTab>
            </DocTabs>
          </section>
        </DocHostContext.Provider>
      );
    };
    const container = await render(<Host />);
    expect(container.querySelectorAll('[role="tab"][aria-selected="true"]')).toHaveLength(3);
    const groups = container.querySelectorAll('[data-host-tabs]');
    expect(groups[0].textContent).toContain('Vanilla body');
    expect(groups[1].textContent).toContain('Vanilla body');
    await selectTab(groups[0], 'React');
    expect(groups[0].textContent).toContain('React body');
    expect(groups[1].textContent).toContain('React body');
    await selectTab(container, 'Canvas');
    expect(container.querySelector('[data-independent]')?.textContent).toContain('Canvas body');
    expect(groups[1].textContent).toContain('React body');
  });
});

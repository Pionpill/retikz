import type { FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { mdxComponents } from '@/modules/docs/components/mdx-content/components';

type ComponentPropsProbeProps = {
  items: Array<{
    name: string;
    kind: 'property' | 'function' | 'constant' | 'type';
    type: string;
    required?: boolean;
    defaultValue?: string;
    value?: string;
    description: string;
  }>;
};

const getComponentProps = (): FC<ComponentPropsProbeProps> => {
  const ComponentProps = mdxComponents.ComponentProps;

  expect(ComponentProps).toBeTypeOf('function');

  return ComponentProps as FC<ComponentPropsProbeProps>;
};

describe('<ComponentProps>', () => {
  it('renders categorized members, values, and MDX descriptions', () => {
    const ComponentProps = getComponentProps();
    const html = renderToStaticMarkup(
      <ComponentProps
        items={[
          {
            name: 'viewBox',
            kind: 'property',
            type: 'IRViewBox',
            defaultValue: '自动取景',
            description: '固定输出范围；省略时按**内容**计算。',
          },
          {
            name: 'onCompileResult',
            kind: 'function',
            type: '(result: CompileResult) => void',
            description: '在一次完整编译后收到结果。',
          },
          {
            name: 'DEFAULT_NODE_DISTANCE',
            kind: 'constant',
            type: 'number',
            value: '24',
            description: '节点相对定位的默认距离。',
          },
          {
            name: 'children',
            kind: 'property',
            type: 'ReactNode',
            required: true,
            description: '作为 JSX 输入传入的子图。',
          },
        ]}
      />,
    );

    expect(html).toContain('data-component-props');
    expect(html).toContain('viewBox');
    expect(html).toContain('Property');
    expect(html).toContain('DEFAULT_NODE_DISTANCE');
    expect(html).toContain('Value');
    expect(html).toContain('自动取景');
    expect(html).not.toContain('font-mono">自动取景');
    expect(html).toContain('data-component-prop-required');
    expect(html).toContain('>REQUIRED<');
    expect(html).toMatch(/<strong[^>]*>内容<\/strong>/);
    expect(html).toContain('data-component-prop-values');
    expect(html).not.toContain('border-y');
    expect(html).toContain('divide-y');
    expect(html).not.toContain('text-muted-foreground">固定输出范围');
  });
});

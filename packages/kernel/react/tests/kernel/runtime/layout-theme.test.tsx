import type { IRScene, IRTheme } from '@retikz/core';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import { CompositeBaseSchema, defineComposite, defineThemeStyle, ThemeMode } from '@retikz/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Layout, Scope, ThemeProvider } from '../../../src/kernel';

const testThemeStyles = ['academic', 'vibrant', 'clean'].map(name =>
  defineThemeStyle({
    name,
    resolve: () => ({
      semantic: { error: '#aa0000', success: '#00aa00', warning: '#aaaa00' },
      categorical: ['#112233'],
    }),
  }),
);

const themedBox = defineComposite({
  namespace: 'theme-test',
  type: 'box',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('theme-test'),
    type: z.literal('box'),
  }),
  expand: (_node, context) => ({
    children: [
      {
        type: 'node',
        position: [0, 0],
        minimumSize: 20,
        padding: 0,
        fill: context.theme.style === 'academic' && context.theme.mode === ThemeMode.Dark ? '#123456' : '#abcdef',
      },
    ],
  }),
});

const makeThemedBoxDefinition = () => themedBox;
const themedBoxAdapter: InputEmbedAdapter = {
  kind: 'ThemedBox',
  lower: () => ({
    node: { namespace: 'theme-test', type: 'box' },
    compositeDependencies: {
      roots: [{ namespace: 'theme-test', type: 'box' }],
      providers: [
        {
          key: { namespace: 'theme-test', type: 'box' },
          dependencies: [],
          datasets: {},
          makeDefinition: makeThemedBoxDefinition,
        },
      ],
    },
  }),
};
const ThemedBox = Object.assign(() => null, {
  isTier2Embeddable: true as const,
  inputEmbedAdapter: themedBoxAdapter,
});

const input: IRScene = {
  type: 'scene',
  version: 1,
  theme: { style: 'academic', mode: ThemeMode.Light },
  children: [{ namespace: 'theme-test', type: 'box' }],
};

const themeProbe = defineComposite({
  namespace: 'theme-test',
  type: 'probe',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('theme-test'),
    type: z.literal('probe'),
  }),
  expand: (_node, context) => {
    const styleColor =
      context.theme.style === 'clean'
        ? '#layout-style'
        : context.theme.style === 'vibrant'
          ? '#ir-style'
          : context.theme.style === 'academic'
            ? '#provider-style'
            : '#default-style';
    return {
      children: [
        {
          type: 'node',
          id: 'style',
          position: [0, 0],
          minimumSize: 20,
          padding: 0,
          fill: styleColor,
        },
        {
          type: 'node',
          id: 'palette',
          position: [30, 0],
          minimumSize: 20,
          padding: 0,
          fill: context.theme.colors.categorical[0],
        },
        {
          type: 'node',
          id: 'error',
          position: [60, 0],
          minimumSize: 20,
          padding: 0,
          stroke: context.theme.colors.semantic.error,
          strokeWidth: 2,
        },
      ],
    };
  },
});

describe('<Layout theme>', () => {
  it('children模式把宿主Theme写入根Scene供Composite读取', () => {
    const markup = renderToStaticMarkup(
      <Layout
        theme={{ style: 'academic', mode: ThemeMode.Dark }}
        themeStyles={testThemeStyles}
        width={100}
        height={100}
      >
        <ThemedBox />
      </Layout>,
    );

    expect(markup).toContain('#123456');
  });

  it('ir 模式按字段覆盖根 Theme并保持输入对象不变', () => {
    const theme: IRTheme = { mode: ThemeMode.Dark };
    const irBefore = structuredClone(input);
    const themeBefore = structuredClone(theme);

    const markup = renderToStaticMarkup(
      <Layout
        ir={input}
        theme={theme}
        composites={[themedBox]}
        themeStyles={testThemeStyles}
        width={100}
        height={100}
      />,
    );

    expect(markup).toContain('#123456');
    expect(input).toEqual(irBefore);
    expect(theme).toEqual(themeBefore);
  });

  it('ir 模式把值为 undefined 的宿主字段视为未声明', () => {
    const theme: IRTheme = { style: undefined, mode: ThemeMode.Dark };

    const markup = renderToStaticMarkup(
      <Layout
        ir={input}
        theme={theme}
        composites={[themedBox]}
        themeStyles={testThemeStyles}
        width={100}
        height={100}
      />,
    );

    expect(markup).toContain('#123456');
  });

  it('省略宿主 prop 时保留持久化 IR Theme', () => {
    const markup = renderToStaticMarkup(
      <Layout
        ir={{ ...input, theme: { style: 'academic', mode: ThemeMode.Dark } }}
        composites={[themedBox]}
        themeStyles={testThemeStyles}
        width={100}
        height={100}
      />,
    );

    expect(markup).toContain('#123456');
  });

  it('Theme prop不进入样式 Scope且不会给 Core primitive隐式着色', () => {
    const markup = renderToStaticMarkup(
      <Layout
        ir={{
          type: 'scene',
          version: 1,
          children: [{ type: 'node', position: [0, 0], minimumSize: 20, fill: '#fedcba' }],
        }}
        theme={{ style: 'vibrant', mode: ThemeMode.Dark }}
        themeStyles={testThemeStyles}
        width={100}
        height={100}
      />,
    );

    expect(markup).toContain('#fedcba');
  });

  it('ambient Theme 按 Provider → IR → Layout 顺序覆盖 selector', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider theme={{ style: 'academic' }} themeStyles={testThemeStyles}>
        <Layout
          ir={{
            type: 'scene',
            version: 1,
            theme: { style: 'vibrant' },
            children: [{ namespace: 'theme-test', type: 'probe' }],
          }}
          theme={{ style: 'clean' }}
          composites={[themeProbe]}
          width={100}
          height={100}
        />
      </ThemeProvider>,
    );

    expect(markup).toContain('#layout-style');
  });

  it('嵌套 ThemeProvider 对 selector 按字段继承', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider theme={{ style: 'academic' }} themeStyles={testThemeStyles}>
        <ThemeProvider theme={{ mode: ThemeMode.Dark }}>
          <Layout width={100} height={100}>
            <ThemedBox />
          </Layout>
        </ThemeProvider>
      </ThemeProvider>,
    );

    expect(markup).toContain('#123456');
  });

  it('嵌入式 Tier 2 adapter 读取所在 Scope 解析后的 Theme', () => {
    const receiveContext = vi.fn();
    const ScopedBox = Object.assign(() => null, {
      isTier2Embeddable: true as const,
      inputEmbedAdapter: {
        ...themedBoxAdapter,
        lower: (_props, context) => {
          receiveContext(context);
          return themedBoxAdapter.lower({}, context);
        },
      } satisfies InputEmbedAdapter,
    });

    renderToStaticMarkup(
      <Layout
        theme={{ style: 'academic', mode: ThemeMode.Light }}
        themeStyles={testThemeStyles}
        width={100}
        height={100}
      >
        <Scope theme={{ mode: ThemeMode.Dark }}>
          <ScopedBox />
        </Scope>
      </Layout>,
    );

    expect(receiveContext).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: expect.objectContaining({ style: 'academic', mode: ThemeMode.Dark }),
      }),
    );
  });

  it('不同 Scope 内的匿名嵌入组件保持不同的内部 identity', () => {
    expect(() =>
      renderToStaticMarkup(
        <Layout themeStyles={testThemeStyles} width={100} height={100}>
          <Scope>
            <ThemedBox />
          </Scope>
          <Scope>
            <ThemedBox />
          </Scope>
        </Layout>,
      ),
    ).not.toThrow();
  });
});

import type { IRScene, IRTheme } from '@retikz/core';

import { CompositeBaseSchema, defineComposite, ThemeMode, ThemeStyle } from '@retikz/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { EmbeddableTier2Adapter } from '../../../src';

import { Layout, ThemeProvider } from '../../../src/kernel';

const themedBox = defineComposite({
  namespace: 'theme-test',
  type: 'box',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('theme-test'),
    type: z.literal('box'),
  }),
  expand: (_node, context) => ({
    type: 'node',
    position: [0, 0],
    minimumSize: 20,
    padding: 0,
    fill: context.theme.style === ThemeStyle.Academic && context.theme.mode === ThemeMode.Dark ? '#123456' : '#abcdef',
  }),
});

const makeThemedBoxComposites = () => [themedBox];
const themedBoxAdapter: EmbeddableTier2Adapter = {
  displayName: 'ThemedBox',
  namespace: 'theme-test',
  contribute: () => ({
    node: { namespace: 'theme-test', type: 'box' },
    datasets: {},
    makeComposites: makeThemedBoxComposites,
  }),
};
const ThemedBox = Object.assign(() => null, {
  isTier2Embeddable: true as const,
  embeddableAdapter: themedBoxAdapter,
});

const input: IRScene = {
  type: 'scene',
  version: 1,
  theme: { style: ThemeStyle.Academic, mode: ThemeMode.Light },
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
      context.theme.style === ThemeStyle.Clean
        ? '#layout-style'
        : context.theme.style === ThemeStyle.Vibrant
          ? '#ir-style'
          : context.theme.style === ThemeStyle.Academic
            ? '#provider-style'
            : '#default-style';
    return [
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
    ];
  },
});

describe('<Layout theme>', () => {
  class ThemeInstance {
    style = ThemeStyle.Academic;
  }

  it('children模式把宿主Theme写入根Scene供Composite读取', () => {
    const markup = renderToStaticMarkup(
      <Layout theme={{ style: ThemeStyle.Academic, mode: ThemeMode.Dark }} width={100} height={100}>
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
      <Layout ir={input} theme={theme} composites={[themedBox]} width={100} height={100} />,
    );

    expect(markup).toContain('#123456');
    expect(input).toEqual(irBefore);
    expect(theme).toEqual(themeBefore);
  });

  it('ir 模式把值为 undefined 的宿主字段视为未声明', () => {
    const theme: IRTheme = { style: undefined, mode: ThemeMode.Dark };

    const markup = renderToStaticMarkup(
      <Layout ir={input} theme={theme} composites={[themedBox]} width={100} height={100} />,
    );

    expect(markup).toContain('#123456');
  });

  it('省略宿主 prop 时保留持久化 IR Theme', () => {
    const markup = renderToStaticMarkup(
      <Layout
        ir={{ ...input, theme: { style: ThemeStyle.Academic, mode: ThemeMode.Dark } }}
        composites={[themedBox]}
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
        theme={{ style: ThemeStyle.Vibrant, mode: ThemeMode.Dark }}
        width={100}
        height={100}
      />,
    );

    expect(markup).toContain('#fedcba');
  });

  it('ambient Theme 按 Provider → IR → Layout 顺序覆盖 selector', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider theme={{ style: ThemeStyle.Academic }}>
        <Layout
          ir={{
            type: 'scene',
            version: 1,
            theme: { style: ThemeStyle.Vibrant },
            children: [{ namespace: 'theme-test', type: 'probe' }],
          }}
          theme={{ style: ThemeStyle.Clean }}
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
      <ThemeProvider theme={{ style: ThemeStyle.Academic }}>
        <ThemeProvider theme={{ mode: ThemeMode.Dark }}>
          <Layout width={100} height={100}>
            <ThemedBox />
          </Layout>
        </ThemeProvider>
      </ThemeProvider>,
    );

    expect(markup).toContain('#123456');
  });

  it.each([
    ['Date', new Date()],
    ['class instance', new ThemeInstance()],
    ['inherited field', Object.create({ style: ThemeStyle.Academic })],
  ])('宿主 overlay不清洗持久化 IR中的伪造 %s Theme', (_label, persistedTheme) => {
    expect(() =>
      renderToStaticMarkup(
        <Layout
          ir={{ type: 'scene', version: 1, theme: persistedTheme, children: [] } as never}
          theme={{ mode: ThemeMode.Dark }}
          width={100}
          height={100}
        />,
      ),
    ).toThrow(/scene\.theme/i);
  });

  it('宿主 overlay不读取持久化 Theme accessor', () => {
    let accessorReads = 0;
    const persistedTheme = {};
    Object.defineProperty(persistedTheme, 'style', {
      enumerable: true,
      get: () => {
        accessorReads += 1;
        return ThemeStyle.Academic;
      },
    });

    expect(() =>
      renderToStaticMarkup(
        <Layout
          ir={{ type: 'scene', version: 1, theme: persistedTheme, children: [] } as never}
          theme={{ mode: ThemeMode.Dark }}
          width={100}
          height={100}
        />,
      ),
    ).toThrow(/scene\.theme/i);
    expect(accessorReads).toBe(0);
  });

  it('宿主overlay不吞掉自有__proto__未知字段', () => {
    const persistedTheme = { style: ThemeStyle.Academic };
    Object.defineProperty(persistedTheme, '__proto__', { value: 'persisted', enumerable: true });

    expect(() =>
      renderToStaticMarkup(
        <Layout
          ir={{ type: 'scene', version: 1, theme: persistedTheme, children: [] } as never}
          theme={{ mode: ThemeMode.Dark }}
          width={100}
          height={100}
        />,
      ),
    ).toThrow(/__proto__/i);
  });
});

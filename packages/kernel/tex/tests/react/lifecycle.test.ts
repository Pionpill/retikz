/// <reference lib="dom" />

// @vitest-environment jsdom
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MathJaxSvgEngine, TexLoweringDiagnostic } from '../../src';
import type * as MathJaxModule from '../../src/mathjax';
import type { MathJaxLowerTexState } from '../../src/react';

const { createLowerTexMock, createMathJaxEngineMock } = vi.hoisted(() => ({
  createLowerTexMock: vi.fn(),
  createMathJaxEngineMock: vi.fn(),
}));

vi.mock('../../src/lower', () => ({ createLowerTex: createLowerTexMock }));
vi.mock('../../src/mathjax', async importOriginal => ({
  ...(await importOriginal<typeof MathJaxModule>()),
  createMathJaxEngine: createMathJaxEngineMock,
}));

import { useLowerTex } from '../../src/react';

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  createLowerTexMock.mockReset();
  createMathJaxEngineMock.mockReset();
});

describe('useLowerTex lifecycle', () => {
  it('组件卸载后引擎才就绪时不创建 lowerer', async () => {
    let resolveEngine: ((engine: MathJaxSvgEngine) => void) | undefined;
    createMathJaxEngineMock.mockReturnValue(
      new Promise<MathJaxSvgEngine>(resolve => {
        resolveEngine = resolve;
      }),
    );
    const Probe = () => {
      useLowerTex();
      return null;
    };
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() => root.render(createElement(Probe)));
    await act(() => root.unmount());
    await act(async () => {
      resolveEngine?.({ convert: () => '<svg />' });
      await Promise.resolve();
    });

    expect(createLowerTexMock).not.toHaveBeenCalled();
  });

  it('options A→B 立即清空旧 lowerer，且晚完成的 A 不覆盖 B', async () => {
    const resolvers = new Map<string, (engine: MathJaxSvgEngine) => void>();
    createMathJaxEngineMock.mockImplementation((options?: { extensions?: Array<string> }) => {
      const extension = options?.extensions?.[0] ?? 'base';
      return new Promise<MathJaxSvgEngine>(resolve => {
        resolvers.set(extension, resolve);
      });
    });
    const lowers = {
      ams: (() => null) as never,
      cancel: (() => null) as never,
    };
    createLowerTexMock.mockImplementation((engine: MathJaxSvgEngine) =>
      engine.convert('', { display: false }) === 'ams' ? lowers.ams : lowers.cancel,
    );

    const values: Array<MathJaxLowerTexState> = [];
    const Probe = ({ extension }: { extension: 'ams' | 'cancel' }) => {
      values.push(useLowerTex({ extensions: [extension] }));
      return null;
    };
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() => root.render(createElement(Probe, { extension: 'ams' })));
    await act(async () => {
      resolvers.get('ams')?.({ convert: () => 'ams' });
      await Promise.resolve();
    });
    expect(values.at(-1)).toMatchObject({ status: 'ready', lowerTex: lowers.ams });

    await act(() => root.render(createElement(Probe, { extension: 'cancel' })));
    expect(values.at(-1)).toMatchObject({ status: 'loading' });

    await act(async () => {
      resolvers.get('cancel')?.({ convert: () => 'cancel' });
      await Promise.resolve();
    });
    expect(values.at(-1)).toMatchObject({ status: 'ready', lowerTex: lowers.cancel });

    await act(async () => {
      resolvers.get('ams')?.({ convert: () => 'late-ams' });
      await Promise.resolve();
    });
    expect(values.at(-1)).toMatchObject({ status: 'ready', lowerTex: lowers.cancel });
    await act(() => root.unmount());
  });

  it('callback 更新不重建 engine/lowerer，并把后续诊断交给最新 callback', async () => {
    createMathJaxEngineMock.mockResolvedValue({ convert: () => 'math' });
    let forwardDiagnostic: ((diagnostic: TexLoweringDiagnostic) => void) | undefined;
    const lower = (() => null) as never;
    createLowerTexMock.mockImplementation(
      (_engine: MathJaxSvgEngine, options?: { onDiagnostic?: typeof forwardDiagnostic }) => {
        forwardDiagnostic = options?.onDiagnostic;
        return lower;
      },
    );
    const first = vi.fn();
    const second = vi.fn();
    const Probe = ({ onDiagnostic }: { onDiagnostic: (diagnostic: TexLoweringDiagnostic) => void }) => {
      useLowerTex({ profile: 'base', extensions: ['color'], onDiagnostic });
      return null;
    };
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(Probe, { onDiagnostic: first }));
      await Promise.resolve();
    });
    await act(() => root.render(createElement(Probe, { onDiagnostic: second })));
    forwardDiagnostic?.({ kind: 'engine-error', source: 'x', message: 'boom' });

    expect(createMathJaxEngineMock).toHaveBeenCalledTimes(1);
    expect(createLowerTexMock).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    await act(() => root.unmount());
  });

  it('等价的 profile shorthand 复用同一个 engine 与 lowerer', async () => {
    createMathJaxEngineMock.mockResolvedValue({ convert: () => 'math' });
    createLowerTexMock.mockReturnValue((() => null));
    const extensions = [
      'ams',
      'newcommand',
      'boldsymbol',
      'braket',
      'cancel',
      'cases',
      'centernot',
      'mathtools',
      'color',
    ] as const;
    const Probe = ({ shorthand }: { shorthand: boolean }) => {
      useLowerTex(shorthand ? { profile: 'math' } : { profile: 'base', extensions: [...extensions] });
      return null;
    };
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(Probe, { shorthand: true }));
      await Promise.resolve();
    });
    await act(async () => {
      root.render(createElement(Probe, { shorthand: false }));
      await Promise.resolve();
    });

    expect(createMathJaxEngineMock).toHaveBeenCalledTimes(1);
    expect(createLowerTexMock).toHaveBeenCalledTimes(1);
    await act(() => root.unmount());
  });
});

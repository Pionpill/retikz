// @vitest-environment jsdom

import { createInstance } from 'i18next';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BenchTestCase } from '../src/playground/app/test-catalog';
import type * as KernelModule from '../src/playground/modules/kernel';

const runKernelLabMock = vi.hoisted(() => vi.fn());

vi.mock('../src/playground/modules/kernel', async importOriginal => ({
  ...(await importOriginal<typeof KernelModule>()),
  runKernelLab: runKernelLabMock,
}));

import { LabActionType } from '../src/playground/app/lab-state';
import { defaultBenchModule } from '../src/playground/app/module-registry';
import { getDefaultBenchTestCase } from '../src/playground/app/test-catalog';
import { usePerformanceLab } from '../src/playground/app/usePerformanceLab';
import { LabBackend, LabRunMode } from '../src/playground/modules/kernel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  runKernelLabMock.mockReset();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('Performance Lab execution lifecycle', () => {
  it('切换页面后忽略尚未完成的旧运行结果', async () => {
    let resolveRun: ((value: unknown) => void) | undefined;
    runKernelLabMock.mockReturnValue(
      new Promise(resolve => {
        resolveRun = resolve;
      }),
    );
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({ lng: 'zh', resources: { zh: { translation: {} } } });
    const testCase = getDefaultBenchTestCase(defaultBenchModule.id);
    if (testCase === undefined) throw new Error('Kernel test case is unavailable');
    const container = document.createElement('div');
    document.body.append(container);
    const Harness = (props: Readonly<{ mode: typeof LabRunMode.Preview | typeof LabRunMode.Benchmark }>) => {
      const { mode } = props;
      const lab = usePerformanceLab(defaultBenchModule, testCase, mode);
      return createElement(
        'div',
        null,
        createElement('button', { type: 'button', onClick: () => void lab.run() }, 'run'),
        createElement('output', null, lab.state.status),
      );
    };
    const root = createRoot(container);

    await act(() =>
      root.render(createElement(I18nextProvider, { i18n }, createElement(Harness, { mode: LabRunMode.Preview }))),
    );
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button')?.click();
      await Promise.resolve();
      await Promise.resolve();
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    expect(runKernelLabMock).toHaveBeenCalledTimes(1);
    expect(container.querySelector('output')?.textContent).toBe('running');

    await act(() =>
      root.render(createElement(I18nextProvider, { i18n }, createElement(Harness, { mode: LabRunMode.Benchmark }))),
    );
    await act(async () => {
      resolveRun?.({
        id: 'stale-session',
        mode: LabRunMode.Preview,
        scenarioId: testCase.scenarioId,
        backend: 'svg',
        startedAt: 1,
        results: [],
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('output')?.textContent).toBe('idle');
    await act(() => root.unmount());
  });

  it('配置失效后不再进入 renderer 执行边界', async () => {
    let continueFrame: FrameRequestCallback | undefined;
    runKernelLabMock.mockResolvedValue({
      id: 'stale-session',
      mode: LabRunMode.Preview,
      scenarioId: 'node-selection',
      backend: LabBackend.Svg,
      startedAt: 1,
      results: [],
    });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      continueFrame = callback;
      return 1;
    });
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({ lng: 'zh', resources: { zh: { translation: {} } } });
    const testCase = getDefaultBenchTestCase(defaultBenchModule.id);
    if (testCase === undefined) throw new Error('Kernel test case is unavailable');
    const container = document.createElement('div');
    document.body.append(container);
    const Harness = () => {
      const lab = usePerformanceLab(defaultBenchModule, testCase, LabRunMode.Preview);
      return createElement(
        'div',
        null,
        createElement('button', { type: 'button', onClick: () => void lab.run(), 'data-action': 'run' }, 'run'),
        createElement(
          'button',
          {
            type: 'button',
            onClick: () => lab.dispatch({ type: LabActionType.BackendSelected, backend: LabBackend.Canvas }),
            'data-action': 'switch',
          },
          'switch',
        ),
        createElement('output', null, lab.state.status),
      );
    };
    const root = createRoot(container);

    await act(() => root.render(createElement(I18nextProvider, { i18n }, createElement(Harness))));
    await act(() => container.querySelector<HTMLButtonElement>('[data-action="run"]')?.click());
    expect(container.querySelector('output')?.textContent).toBe('running');
    await act(() => container.querySelector<HTMLButtonElement>('[data-action="switch"]')?.click());
    expect(container.querySelector('output')?.textContent).toBe('idle');
    await act(async () => {
      continueFrame?.(0);
      await Promise.resolve();
      await Promise.resolve();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(runKernelLabMock).not.toHaveBeenCalled();
    await act(() => root.unmount());
  });

  it('切换测试用例后执行新用例对应的场景', async () => {
    runKernelLabMock.mockResolvedValue({
      id: 'new-session',
      mode: LabRunMode.Benchmark,
      scenarioId: 'new-scenario',
      backend: LabBackend.Svg,
      startedAt: 1,
      results: [],
    });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({ lng: 'zh', resources: { zh: { translation: {} } } });
    const initialTestCase = getDefaultBenchTestCase(defaultBenchModule.id);
    if (initialTestCase === undefined) throw new Error('Kernel test case is unavailable');
    const newTestCase: BenchTestCase = Object.freeze({
      ...initialTestCase,
      id: 'new-case',
      scenarioId: 'new-scenario',
    });
    const container = document.createElement('div');
    document.body.append(container);
    const Harness = (props: Readonly<{ testCase: BenchTestCase }>) => {
      const lab = usePerformanceLab(defaultBenchModule, props.testCase, LabRunMode.Benchmark);
      return createElement('button', { type: 'button', onClick: () => void lab.run() }, 'run');
    };
    const root = createRoot(container);

    await act(() =>
      root.render(createElement(I18nextProvider, { i18n }, createElement(Harness, { testCase: initialTestCase }))),
    );
    await act(() =>
      root.render(createElement(I18nextProvider, { i18n }, createElement(Harness, { testCase: newTestCase }))),
    );
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button')?.click();
      await Promise.resolve();
      await Promise.resolve();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(runKernelLabMock).toHaveBeenCalledWith(
      expect.objectContaining({ scenarioId: 'new-scenario' }),
      expect.any(Function),
    );
    await act(() => root.unmount());
  });
});

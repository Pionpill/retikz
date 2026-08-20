// @vitest-environment jsdom
import type { FC } from 'react';
import type { Root } from 'react-dom/client';

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import type {
  PreviewControlsDefinition,
  PreviewControlState,
  PreviewControlValues,
} from '../../src/modules/docs/components/component-preview';

import { definePreviewControls, usePreviewControls } from '../../src/modules/docs/components/component-preview';
import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import { usePreviewControlState } from '../../src/modules/docs/components/component-preview/hooks';

const appearanceDefinition = definePreviewControls({
  presentation: 'panel',
  sections: [
    {
      controls: [
        { kind: 'number', id: 'strokeWidth', label: 'Stroke width', defaultValue: 2 },
        { kind: 'switch', id: 'dashed', label: 'Dashed', defaultValue: false },
      ],
    },
  ],
});

const contentDefinition = definePreviewControls({
  presentation: 'panel',
  sections: [{ controls: [{ kind: 'text', id: 'text', label: 'Text', defaultValue: 'New' }] }],
});

type ConsumerProps = {
  definition: PreviewControlsDefinition;
  state: PreviewControlState;
  onSnapshot: (state: PreviewControlState, values: Record<string, unknown>) => void;
};

const Consumer: FC<ConsumerProps> = props => {
  const { definition, state, onSnapshot } = props;
  const values = usePreviewControls(definition);
  onSnapshot(state, values);
  return null;
};

type HarnessProps = {
  definition: PreviewControlsDefinition;
  canonicalValues?: Readonly<PreviewControlValues>;
  onSnapshot: ConsumerProps['onSnapshot'];
};

const Harness: FC<HarnessProps> = props => {
  const { definition, canonicalValues, onSnapshot } = props;
  const state = usePreviewControlState(definition, canonicalValues);

  return (
    <PreviewControlStateContext.Provider value={state}>
      <button type="button" onClick={() => state.setValue('strokeWidth', 4)}>
        width
      </button>
      <button type="button" onClick={() => state.setValue('dashed', true)}>
        dashed
      </button>
      <button type="button" onClick={state.reset}>
        reset
      </button>
      <button type="button" onClick={() => state.applyValues({ strokeWidth: 6 })}>
        preset
      </button>
      <Consumer definition={definition} state={state} onSnapshot={onSnapshot} />
    </PreviewControlStateContext.Provider>
  );
};

type StabilityHarnessProps = {
  onSnapshot: (state: PreviewControlState) => void;
};

const StabilityHarness: FC<StabilityHarnessProps> = props => {
  const { onSnapshot } = props;
  const [, setParentRevision] = useState(0);
  const state = usePreviewControlState(appearanceDefinition);
  onSnapshot(state);

  return (
    <button type="button" onClick={() => setParentRevision(revision => revision + 1)}>
      rerender parent
    </button>
  );
};

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const renderedRoots: Array<Root> = [];

afterEach(async () => {
  for (const root of renderedRoots.splice(0)) {
    await act(() => root.unmount());
  }
  document.body.replaceChildren();
});

describe('preview control state', () => {
  it('从 definition 初始化并提供类型化值', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    renderedRoots.push(root);
    let values: Record<string, unknown> = {};

    await act(() =>
      root.render(
        <Harness
          definition={appearanceDefinition}
          onSnapshot={(_state, nextValues) => {
            values = nextValues;
          }}
        />,
      ),
    );

    expect(values).toEqual({ strokeWidth: 2, dashed: false });
  });

  it('更新多个类型并恢复 definition 默认值', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    renderedRoots.push(root);
    let values: Record<string, unknown> = {};

    await act(() =>
      root.render(
        <Harness
          definition={appearanceDefinition}
          onSnapshot={(_state, nextValues) => {
            values = nextValues;
          }}
        />,
      ),
    );
    const buttons = container.querySelectorAll('button');

    await act(() => buttons[0].click());
    await act(() => buttons[1].click());
    expect(values).toEqual({ strokeWidth: 4, dashed: true });

    await act(() => buttons[2].click());
    expect(values).toEqual({ strokeWidth: 2, dashed: false });
  });

  it('以 canonical values 初始化并原子应用 preset', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    renderedRoots.push(root);
    let state: PreviewControlState | undefined;
    let values: Record<string, unknown> = {};

    await act(() =>
      root.render(
        <Harness
          definition={appearanceDefinition}
          canonicalValues={{ strokeWidth: 3, dashed: true }}
          onSnapshot={(nextState, nextValues) => {
            state = nextState;
            values = nextValues;
          }}
        />,
      ),
    );

    expect(state?.canonicalValues).toEqual({ strokeWidth: 3, dashed: true });
    expect(values).toEqual({ strokeWidth: 3, dashed: true });

    const buttons = container.querySelectorAll('button');
    await act(() => buttons[0].click());
    await act(() => buttons[3].click());
    expect(values).toEqual({ strokeWidth: 6, dashed: true });

    await act(() => buttons[2].click());
    expect(values).toEqual({ strokeWidth: 3, dashed: true });
  });

  it('definition 切换时移除旧 id 并初始化新默认值', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    renderedRoots.push(root);
    let state: PreviewControlState | undefined;
    let values: Record<string, unknown> = {};
    const onSnapshot: ConsumerProps['onSnapshot'] = (nextState, nextValues) => {
      state = nextState;
      values = nextValues;
    };

    await act(() => root.render(<Harness definition={appearanceDefinition} onSnapshot={onSnapshot} />));
    expect(state?.values).toEqual({ strokeWidth: 2, dashed: false });

    await act(() => root.render(<Harness definition={contentDefinition} onSnapshot={onSnapshot} />));
    expect(state?.values).toEqual({ text: 'New' });
    expect(values).toEqual({ text: 'New' });
  });

  it('父级无关状态更新时保持 control state 引用稳定', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    renderedRoots.push(root);
    const snapshots: Array<PreviewControlState> = [];

    await act(() => root.render(<StabilityHarness onSnapshot={state => snapshots.push(state)} />));
    const initialState = snapshots.at(-1);

    await act(() => container.querySelector('button')?.click());

    expect(snapshots.at(-1)).toBe(initialState);
  });
});

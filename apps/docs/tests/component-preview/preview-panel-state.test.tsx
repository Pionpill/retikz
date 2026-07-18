import type { FC } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewPanelState } from '../../src/modules/docs/components/component-preview/preview-panel';
import type { PreviewControlState } from '../../src/modules/docs/components/component-preview/types';

import { buildAnimationControlSlots } from '../../src/modules/docs/components/component-preview/controls';
import {
  buildConfiguredControlSlots,
  usePreviewPanelState,
} from '../../src/modules/docs/components/component-preview/preview-panel';

type ProbeProps = {
  controlState: PreviewControlState;
  onState: (state: PreviewPanelState) => void;
};

const Probe: FC<ProbeProps> = props => {
  const { controlState, onState } = props;
  const state = usePreviewPanelState({
    controlState,
    rendererMode: 'svg',
    size: 'md',
    dragEnabled: false,
    expanded: false,
  });
  onState(state);
  return null;
};

const createControlState = (): PreviewControlState => {
  const state: PreviewControlState = {
    values: {},
    setValue: (id, value) => {
      state.values = { ...state.values, [id]: value };
    },
    reset: () => {
      state.values = {};
    },
  };
  return state;
};

describe('usePreviewPanelState', () => {
  it('让两个预览面板共享 control state 并隔离 runtime 与渲染 ref', () => {
    let card: PreviewPanelState | null = null;
    let dialog: PreviewPanelState | null = null;
    const controlState = createControlState();

    renderToStaticMarkup(<Probe controlState={controlState} onState={state => (card = state)} />);
    renderToStaticMarkup(<Probe controlState={controlState} onState={state => (dialog = state)} />);

    expect(card).not.toBeNull();
    expect(dialog).not.toBeNull();
    expect(card!.runtime).not.toBe(dialog!.runtime);
    expect(card!.controlState).toBe(dialog!.controlState);
    expect(card!.controlState).toBe(controlState);
    expect(card!.renderPaneRef).not.toBe(dialog!.renderPaneRef);
    expect(card!.runtime.value('curve')).toBeUndefined();
    card!.runtime.setValue('curve', 'step');
    expect(dialog!.runtime.value('curve')).toBe('step');
  });

  it('让 configured 与 animation 定义分别通过接收方 runtime 求值', () => {
    let card: PreviewPanelState | null = null;
    let dialog: PreviewPanelState | null = null;
    renderToStaticMarkup(<Probe controlState={createControlState()} onState={state => (card = state)} />);
    renderToStaticMarkup(<Probe controlState={createControlState()} onState={state => (dialog = state)} />);
    const cardState: PreviewPanelState = card!;
    const dialogState: PreviewPanelState = dialog!;
    cardState.runtime.value = () => 'card-value';
    dialogState.runtime.value = () => 'dialog-value';
    cardState.runtime.active = () => false;
    dialogState.runtime.active = () => true;
    const configuredSlot = buildConfiguredControlSlots([
      { kind: 'text', id: 'curve', label: 'Curve', defaultValue: 'default' },
    ])[0];
    const animationSlot = buildAnimationControlSlots()[0];

    const cardConfigured = renderToStaticMarkup(configuredSlot.render(cardState.runtime));
    const dialogConfigured = renderToStaticMarkup(configuredSlot.render(dialogState.runtime));
    const cardAnimation = renderToStaticMarkup(animationSlot.render(cardState.runtime));
    const dialogAnimation = renderToStaticMarkup(animationSlot.render(dialogState.runtime));

    expect(cardConfigured).toContain('value="card-value"');
    expect(dialogConfigured).toContain('value="dialog-value"');
    expect(cardAnimation).toContain('aria-label="Pause"');
    expect(dialogAnimation).toContain('aria-label="Play"');
  });
});

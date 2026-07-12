import type { FC } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewPanelState } from '../../src/modules/docs/components/component-preview/preview-panel';

import { buildAnimationControlSlots } from '../../src/modules/docs/components/component-preview/controls';
import {
  buildConfiguredControlSlots,
  usePreviewPanelState,
} from '../../src/modules/docs/components/component-preview/preview-panel';

type ProbeProps = {
  onState: (state: PreviewPanelState) => void;
};

const Probe: FC<ProbeProps> = props => {
  const { onState } = props;
  const state = usePreviewPanelState({
    rendererMode: 'svg',
    size: 'md',
    dragEnabled: false,
    expanded: false,
  });
  onState(state);
  return null;
};

describe('usePreviewPanelState', () => {
  it('为每个预览面板创建独立 runtime、control state 与渲染 ref', () => {
    let card: PreviewPanelState | null = null;
    let dialog: PreviewPanelState | null = null;

    renderToStaticMarkup(<Probe onState={state => (card = state)} />);
    renderToStaticMarkup(<Probe onState={state => (dialog = state)} />);

    expect(card).not.toBeNull();
    expect(dialog).not.toBeNull();
    expect(card!.runtime).not.toBe(dialog!.runtime);
    expect(card!.controlState).not.toBe(dialog!.controlState);
    expect(card!.renderPaneRef).not.toBe(dialog!.renderPaneRef);
    expect(card!.runtime.value('curve')).toBeUndefined();
    expect(dialog!.runtime.value('curve')).toBeUndefined();
  });

  it('让 configured 与 animation 定义分别通过接收方 runtime 求值', () => {
    let card: PreviewPanelState | null = null;
    let dialog: PreviewPanelState | null = null;
    renderToStaticMarkup(<Probe onState={state => (card = state)} />);
    renderToStaticMarkup(<Probe onState={state => (dialog = state)} />);
    const cardState: PreviewPanelState = card!;
    const dialogState: PreviewPanelState = dialog!;
    cardState.runtime.value = () => 'card-value';
    dialogState.runtime.value = () => 'dialog-value';
    cardState.runtime.active = () => false;
    dialogState.runtime.active = () => true;
    const configuredSlot = buildConfiguredControlSlots([
      { kind: 'input', id: 'curve', label: 'Curve', defaultValue: 'default' },
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

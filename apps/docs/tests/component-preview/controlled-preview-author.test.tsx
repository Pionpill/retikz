import { existsSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { defineControlledPreview, definePreviewControls } from '@/modules/docs/preview';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';

const controls = definePreviewControls({
  presentation: 'panel',
  sections: [
    {
      controls: [{ kind: 'range', id: 'width', label: 'Width', defaultValue: 10, min: 0, max: 100 }],
    },
  ],
});

const contract = {
  controls,
  canonicalValues: { width: 20 },
  relatedApis: ['Node.width'],
} satisfies PreviewControlContract;

describe('controlled preview authoring', () => {
  it('提供独立的短作者入口', () => {
    expect(existsSync(new URL('../../src/modules/docs/preview/index.ts', import.meta.url))).toBe(true);
  });

  it('公开 controls demo 的共享作者入口', () => {
    expect(defineControlledPreview).toEqual(expect.any(Function));
  });

  it('canonicalRender 使用稳定基线，Component 使用实时 controls 值', () => {
    const controlledPreview = defineControlledPreview(contract, values => <span>{values.width}</span>);

    expect(renderToStaticMarkup(controlledPreview.source.canonicalRender?.())).toBe('<span>20</span>');

    const liveMarkup = renderToStaticMarkup(
      <PreviewControlStateContext.Provider
        value={{
          canonicalValues: { width: 20 },
          values: { width: 30 },
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        }}
      >
        <controlledPreview.Component />
      </PreviewControlStateContext.Provider>,
    );
    expect(liveMarkup).toBe('<span>30</span>');
  });
});

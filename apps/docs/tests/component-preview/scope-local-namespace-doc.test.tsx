import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import { previewControlContract } from '../../src/modules/docs/contents/kernel/components/scope/usage/scope-local-namespace-basic.controls';
import ScopeLocalNamespacePreview from '../../src/modules/docs/contents/kernel/components/scope/usage/scope-local-namespace-basic.demo';

const renderPreview = (localNamespace: boolean): string =>
  renderToStaticMarkup(
    createElement(
      PreviewControlStateContext.Provider,
      {
        value: {
          canonicalValues: previewControlContract.canonicalValues,
          values: { ...previewControlContract.canonicalValues, localNamespace },
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        },
      },
      createElement(ScopeLocalNamespacePreview),
    ),
  );

describe('Scope 局部命名空间 playground', () => {
  it('切换隔离时保留外部引用来源，并产生不同的连线结果', () => {
    const isolatedMarkup = renderPreview(true);
    const flatMarkup = renderPreview(false);

    expect(isolatedMarkup).toContain('source');
    expect(flatMarkup).toContain('source');
    expect(flatMarkup).not.toBe(isolatedMarkup);
  });
});

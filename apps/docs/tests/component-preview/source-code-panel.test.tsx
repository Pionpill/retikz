import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  InlineSourcePanel,
  useSourcePanelState,
} from '../../src/modules/docs/components/component-preview/source-panel';
import { computeUnifiedDiff } from '../../src/modules/docs/components/component-preview/utils';

const noop = () => undefined;

const SourcePanelProbe = () => {
  const state = useSourcePanelState({
    react: {
      files: [
        {
          filename: 'example.tsx',
          code: Array.from({ length: 16 }, (_, index) => `const line${index} = ${index};`).join('\n'),
          lang: 'tsx',
        },
      ],
    },
  });

  return (
    <InlineSourcePanel
      state={state}
      isCodeVisible
      showAskAi={false}
      onAskAi={noop}
      isExpanded={false}
      onExpandedChange={noop}
      onHideSource={noop}
      onShowCode={noop}
    />
  );
};

describe('InlineSourcePanel 折叠源码高度', () => {
  it('默认源码展开后折叠为 15 行代码高度', () => {
    const markup = renderToStaticMarkup(<SourcePanelProbe />);

    expect(markup).toContain('[&amp;_pre]:max-h-[calc(15*1.5em)]');
    expect(markup).toContain('[&amp;_pre]:overflow-y-auto');
  });
});

describe('component-preview diff owner', () => {
  it('从中立 utils owner 生成 unified diff', () => {
    expect(computeUnifiedDiff('a\nb', 'a\nc')).toEqual({
      code: 'a\nb\nc',
      lineKinds: ['context', 'removed', 'added'],
    });
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { SourceCodePanelProps } from '../../src/modules/docs/components/component-preview';

import { SourceCodePanel } from '../../src/modules/docs/components/component-preview';

const noop = () => undefined;

const buildProps = (overrides: Partial<SourceCodePanelProps> = {}): SourceCodePanelProps => ({
  views: ['react'],
  view: 'react',
  onViewChange: noop,
  files: [{ filename: 'example.tsx', code: 'const x = 1;', lang: 'tsx' }],
  activeFileIndex: 0,
  onFileChange: noop,
  showFull: true,
  showDiffPicker: false,
  diffMode: 'off',
  onDiffModeChange: noop,
  copied: false,
  onCopy: noop,
  showAskAi: false,
  onAskAi: noop,
  displayedLineCount: 16,
  isExpanded: false,
  onExpandedChange: noop,
  onHideSource: noop,
  displayedLang: 'tsx',
  displayedCode: Array.from({ length: 16 }, (_, index) => `const line${index} = ${index};`).join('\n'),
  onShowCode: noop,
  ...overrides,
});

describe('SourceCodePanel 折叠源码高度', () => {
  it('默认源码展开后折叠为 15 行代码高度', () => {
    const markup = renderToStaticMarkup(<SourceCodePanel {...buildProps()} />);

    expect(markup).toContain('[&amp;_pre]:max-h-[calc(15*1.5em)]');
    expect(markup).toContain('[&amp;_pre]:overflow-y-auto');
  });
});

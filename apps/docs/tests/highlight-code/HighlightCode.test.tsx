import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HighlightCode } from '../../src/modules/docs/components/highlight-code';

describe('<HighlightCode>', () => {
  it('按实际源码行号渲染并突出指定范围', () => {
    const html = renderToStaticMarkup(
      <HighlightCode
        lang="ts"
        code={'const first = 1;\nconst second = 2;\nconst third = 3;'}
        showLineNumbers
        lineNumberStart={38}
        activeLineRange={{ start: 39, end: 40 }}
      />,
    );

    expect(html).toContain('data-source-line="38"');
    expect(html).toContain('data-source-line="39" data-source-line-active="true"');
    expect(html).toContain('data-source-line="40" data-source-line-active="true"');
    expect(html).toContain('data-source-active-rail="true"');
    expect(html).toContain('top:1.5rem;height:3rem');
  });
});

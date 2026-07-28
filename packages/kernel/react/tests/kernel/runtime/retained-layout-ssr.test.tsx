import type { IRScene } from '@retikz/core';

import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { Layout } from '../../../src';

const source: IRScene = {
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'node', position: [0, 0], shape: 'rectangle' }],
};

describe('React Layout retained SSR', () => {
  it('server render 输出 opaque seed 且不报告 useLayoutEffect warning', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const html = renderToString(<Layout ir={source} />);

    expect(html).toContain('<svg');
    expect(html).toContain('data-retikz-id="node"');
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

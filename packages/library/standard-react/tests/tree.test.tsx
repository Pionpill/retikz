import { createInputScene } from '@retikz/react';
import { tree, TreeInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import type { InputTree } from '@retikz/standard-vanilla/collection';
import { normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { Tree } from '../src/collection';
import { synchronousAdapters } from './helpers/synchronous-adapters';

it('Tree字符串与对象配置的Source及SVG和Vanilla等价', () => {
  for (const props of [
    { root: { content: '1', children: [null, '2'] } },
    { root: 'A' },
    { root: {} },
    { root: null },
  ] satisfies Array<InputTree>) {
    const jsx = createInputScene(<Tree {...props} />);
    const vanilla = scene({ children: [tree(props)] });
    const options = { adapters: synchronousAdapters(jsx.adapters) };
    expect(normalizeScene(jsx.scene, options).ir).toEqual(
      normalizeScene(vanilla, { adapters: [TreeInputEmbedAdapter] }).ir,
    );
    expect(renderToSvgString(jsx.scene, options)).toEqual(
      renderToSvgString(vanilla, { adapters: [TreeInputEmbedAdapter] }),
    );
  }
});

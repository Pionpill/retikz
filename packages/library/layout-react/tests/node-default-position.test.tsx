import { Layout, Node } from '@retikz/react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FlexLayout, FlexLayoutItem, GridLayout, GridLayoutItem, OverlayLayout, OverlayLayoutItem } from '../src';

const layouts = [
  {
    name: 'flex',
    wrap: (a: ReactNode, b: ReactNode) => (
      <FlexLayout>
        <FlexLayoutItem>{a}</FlexLayoutItem>
        <FlexLayoutItem>{b}</FlexLayoutItem>
      </FlexLayout>
    ),
  },
  {
    name: 'grid',
    wrap: (a: ReactNode, b: ReactNode) => (
      <GridLayout columns={[{ kind: 'content', mode: 'natural' }]}>
        <GridLayoutItem>{a}</GridLayoutItem>
        <GridLayoutItem>{b}</GridLayoutItem>
      </GridLayout>
    ),
  },
  {
    name: 'overlay',
    wrap: (a: ReactNode, b: ReactNode) => (
      <OverlayLayout>
        <OverlayLayoutItem>{a}</OverlayLayoutItem>
        <OverlayLayoutItem>{b}</OverlayLayoutItem>
      </OverlayLayout>
    ),
  },
];

describe('Layout child default position', () => {
  it.each(layouts)('$name 测量与输出等价于显式局部原点', ({ wrap }) => {
    const render = (explicit: boolean) =>
      renderToStaticMarkup(
        <Layout runtime={{ mode: 'static' }} idPrefix="default-position">
          {wrap(
            explicit ? <Node position={[0, 0]} text="A" /> : <Node text="A" />,
            <Node text="B" position={[0, 0]} />,
          )}
        </Layout>,
      );
    expect(render(false)).toEqual(render(true));
    expect(render(false)).toContain('<svg');
  });
});

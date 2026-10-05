import { createInputScene, Node } from '@retikz/react';
import { StandardInputEmbedAdapters } from '@retikz/standard-vanilla';
import { array, map, ArrayInputEmbedAdapter, MapInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import { normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { Array, ArrayItem, Map, MapEntry, MapKey, MapValue } from '../src/collection';
import { synchronousAdapters } from './helpers/synchronous-adapters';

const node = { type: 'node' as const, position: [0, 0] as [number, number], text: 'A' };
it('preserves index identities with explicit JSX cell ids and data through both adapters', () => {
  const marker = createInputScene(
    <Array id="array" cellIdMode="index">
      <ArrayItem id="named" text="A" />
    </Array>,
  );
  const vanillaInput = scene({
    children: [array({ id: 'array', cellIdMode: 'index', items: [{ id: 'named', content: 'A' }] })],
  });

  expect(normalizeScene(marker.scene, { adapters: synchronousAdapters(marker.adapters) }).ir).toEqual(
    normalizeScene(vanillaInput, { adapters: [ArrayInputEmbedAdapter] }).ir,
  );
  expect(renderToSvgString(marker.scene, { adapters: synchronousAdapters(marker.adapters) })).toEqual(
    renderToSvgString(vanillaInput, { adapters: [ArrayInputEmbedAdapter] }),
  );

  const data = createInputScene(<Array id="data" cellIdMode="index" data={['A', 'A']} />);

  expect(normalizeScene(data.scene, { adapters: synchronousAdapters(data.adapters) }).ir).toEqual(
    normalizeScene(scene({ children: [array({ id: 'data', cellIdMode: 'index', data: ['A', 'A'] })] }), {
      adapters: [ArrayInputEmbedAdapter],
    }).ir,
  );
});
it('preserves mixed Array string and object items across React and Vanilla', () => {
  const items = ['A', { content: 'B', id: 'custom', style: { fill: 'blue' } }];
  const input = createInputScene(<Array items={items} />);
  const react = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
  const vanilla = normalizeScene(scene({ children: [array({ items })] }), { adapters: [ArrayInputEmbedAdapter] });

  expect(react.ir).toEqual(vanilla.ir);
  expect(react.ir.children[0]).toMatchObject({ items });
});
it('preserves the string identity option across React and Vanilla', () => {
  const items = ['A', 'B'];
  const input = createInputScene(<Array items={items} cellIdMode="string" />);
  const react = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
  const vanilla = normalizeScene(scene({ children: [array({ items, cellIdMode: 'string' })] }), {
    adapters: [ArrayInputEmbedAdapter],
  });

  expect(react.ir).toEqual(vanilla.ir);
  expect(react.ir.children[0]).toMatchObject({ items, cellIdMode: 'string' });
});
describe('Array / Map adapter parity', () => {
  it('preserves Array content width through items, markers and Vanilla', () => {
    const items = [{ content: 'A', layout: { width: 'content' as const } }, 'longer'];
    const fromItems = createInputScene(<Array items={items} layout={{ width: 'content' }} />);
    const fromMarkers = createInputScene(
      <Array layout={{ width: 'content' }}>
        <ArrayItem text="A" layout={{ width: 'content' }} />
        <ArrayItem text="longer" />
      </Array>,
    );
    const fromVanilla = normalizeScene(scene({ children: [array({ items, layout: { width: 'content' } })] }), {
      adapters: [ArrayInputEmbedAdapter],
    });

    expect(normalizeScene(fromItems.scene, { adapters: synchronousAdapters(fromItems.adapters) }).ir).toEqual(
      fromVanilla.ir,
    );

    const markerInput = normalizeScene(fromMarkers.scene, { adapters: synchronousAdapters(fromMarkers.adapters) });
    const markerVanilla = normalizeScene(
      scene({
        children: [
          array({
            items: [{ content: 'A', layout: { width: 'content' } }, { content: 'longer' }],
            layout: { width: 'content' },
          }),
        ],
      }),
      { adapters: [ArrayInputEmbedAdapter] },
    );

    expect(markerInput.ir).toEqual(markerVanilla.ir);
  });

  it.each([
    true,
    false,
    {},
    { position: 'after' as const, start: 7, style: { font: { size: 24 }, textColor: 'red', opacity: 0.5 } },
  ])('preserves index configuration across adapters: %j', index => {
    const items = ['A', 'B1'];
    const input = createInputScene(<Array items={items} index={index} />);
    const react = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
    const vanilla = normalizeScene(scene({ children: [array({ items, index })] }), {
      adapters: [ArrayInputEmbedAdapter],
    });

    expect(react.ir).toEqual(vanilla.ir);
    expect(react.ir.children[0]).toMatchObject({ index });
    expect(react.contributions).toEqual(vanilla.contributions);
  });

  it('retains nested providers, styles and sparse IR equally across React and Vanilla', () => {
    const input = createInputScene(
      <Map
        style={{ fill: 'red', key: { fill: 'green' }, value: { fillOpacity: 0.3 } }}
        layout={{ padding: 0, key: { width: 60 }, value: { height: 40 } }}
      >
        <MapEntry>
          <MapKey>
            <Node position={[0, 0]} text="A" />
          </MapKey>
          <MapValue style={{ fill: 'blue' }}>
            <Array>
              <ArrayItem>
                <Node position={[0, 0]} text="A" />
              </ArrayItem>
            </Array>
          </MapValue>
        </MapEntry>
      </Map>,
    );
    const react = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
    const vanilla = normalizeScene(
      scene({
        children: [
          map({
            style: { fill: 'red', key: { fill: 'green' }, value: { fillOpacity: 0.3 } },
            layout: { padding: 0, key: { width: 60 }, value: { height: 40 } },
            entries: [
              {
                key: { content: node },
                value: { style: { fill: 'blue' }, content: array({ items: [{ content: node }] }) },
              },
            ],
          }),
        ],
      }),
      { adapters: [ArrayInputEmbedAdapter, MapInputEmbedAdapter] },
    );

    expect(react.ir.children[0]).toMatchObject({
      style: { key: { fill: 'green' }, value: { fillOpacity: 0.3 } },
      layout: { key: { width: 60 }, value: { height: 40 } },
    });
    expect(react.ir).toEqual(vanilla.ir);
    expect(react.contributions).toEqual(vanilla.contributions);
  });

  it('produces identical text IR and contributions from data, markers and Vanilla', () => {
    const data = createInputScene(
      <Map entries={[{ key: { content: '' }, value: { content: 'B', style: { fill: 'blue' } } }]} />,
    );
    const markers = createInputScene(
      <Map>
        <MapEntry>
          <>
            <MapKey text="" />
            <MapValue text="B" style={{ fill: 'blue' }} />
          </>
        </MapEntry>
      </Map>,
    );
    const vanilla = normalizeScene(
      scene({
        children: [
          map({
            entries: [{ key: { content: '' }, value: { content: 'B', style: { fill: 'blue' } } }],
          }),
        ],
      }),
      { adapters: [MapInputEmbedAdapter] },
    );

    for (const input of [data, markers]) {
      const actual = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });

      expect(actual.ir).toEqual(vanilla.ir);
      expect(actual.contributions).toEqual(vanilla.contributions);
    }

    expect(JSON.stringify(vanilla.ir)).toContain('"content":""');
  });

  it('preserves array data and marker styles, order, fragments and empty lists', () => {
    const data = createInputScene(
      <Array
        items={[{ content: 'A' }, { content: 'B', id: 'b', style: { fillOpacity: 0 }, layout: { padding: 0 } }]}
      />,
    );
    const markers = createInputScene(
      <Array>
        <>
          <ArrayItem text="A" />
          {false}
          <ArrayItem text="B" id="b" style={{ fillOpacity: 0 }} layout={{ padding: 0 }} />
        </>
      </Array>,
    );

    expect(normalizeScene(data.scene, { adapters: synchronousAdapters(data.adapters) }).ir).toEqual(
      normalizeScene(markers.scene, { adapters: synchronousAdapters(markers.adapters) }).ir,
    );

    const empty = createInputScene(<Array />);
    const emptyData = createInputScene(<Array items={[]} />);

    expect(normalizeScene(empty.scene, { adapters: synchronousAdapters(empty.adapters) }).ir).toEqual(
      normalizeScene(emptyData.scene, { adapters: synchronousAdapters(emptyData.adapters) }).ir,
    );
  });

  it('rejects missing or multiple drawable children', () => {
    expect(() =>
      createInputScene(
        <Array>
          <ArrayItem>{null}</ArrayItem>
        </Array>,
      ),
    ).toThrow(/exactly one/);
    expect(() =>
      createInputScene(
        <Map>
          <MapEntry>
            <MapKey>
              <>
                <Node position={[0, 0]} />
                <Node position={[1, 1]} />
              </>
            </MapKey>
            <MapValue text="value" />
          </MapEntry>
        </Map>,
      ),
    ).toThrow(/exactly one/);
  });

  it('rejects malformed marker topology and incomplete or duplicate Map slots', () => {
    expect(() =>
      createInputScene(
        <Array>
          <Node position={[0, 0]} />
        </Array>,
      ),
    ).toThrow(/direct marker/);
    expect(() =>
      createInputScene(
        <Map>
          <MapKey text="key" />
        </Map>,
      ),
    ).toThrow(/direct marker/);
    expect(() =>
      createInputScene(
        <Map>
          <MapEntry>
            <MapKey text="key" />
          </MapEntry>
        </Map>,
      ),
    ).toThrow(/one MapKey and one MapValue/);
    expect(() =>
      createInputScene(
        <Map>
          <MapEntry>
            <MapKey text="a" />
            <MapKey text="b" />
            <MapValue text="value" />
          </MapEntry>
        </Map>,
      ),
    ).toThrow(/exactly one MapKey/);
    expect(() => createInputScene(<ArrayItem text="orphan" />)).toThrow(/direct child/);
  });
});

it('passes mixed JSON data through React and Vanilla with identical contributions', () => {
  const data = { id: 'ordinary data', values: ['', '', null, { enabled: false }] };
  const input = createInputScene(<Map data={data} layout={{ value: { width: 70 } }} />);
  const react = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
  const vanilla = normalizeScene(scene({ children: [map({ data, layout: { value: { width: 70 } } })] }), {
    adapters: [MapInputEmbedAdapter],
  });

  expect(react.ir).toEqual(vanilla.ir);
  expect(react.contributions).toEqual(vanilla.contributions);
  expect(react.ir.children[0]).toMatchObject({ data });
  expect(react.ir.children[0]).not.toHaveProperty('entries');

  const listInput = createInputScene(<Array data={['', '', data]} />);
  const reactArray = normalizeScene(listInput.scene, { adapters: synchronousAdapters(listInput.adapters) });
  const vanillaArray = normalizeScene(scene({ children: [array({ data: ['', '', data] })] }), {
    adapters: [ArrayInputEmbedAdapter],
  });

  expect(reactArray.ir).toEqual(vanillaArray.ir);
  expect(reactArray.contributions).toEqual(vanillaArray.contributions);
  expect(renderToSvgString(input.scene, { adapters: synchronousAdapters(input.adapters) })).toEqual(
    renderToSvgString(scene({ children: [map({ data, layout: { value: { width: 70 } } })] }), {
      adapters: [MapInputEmbedAdapter],
    }),
  );
});

it.each([false, [], ['map'], ['array']] as const)(
  'preserves data expansion %j through React and Vanilla',
  selection => {
    const dataExpand = typeof selection === 'boolean' ? selection : [...selection];
    const data = [{ a: 1 }, [{ b: true }]];
    const reactInput = createInputScene(
      <>
        <Array data={data} dataExpand={dataExpand} />
        <Map data={{ value: data }} dataExpand={dataExpand} />
      </>,
    );
    const vanillaInput = scene({ children: [array({ data, dataExpand }), map({ data: { value: data }, dataExpand })] });
    const react = normalizeScene(reactInput.scene, { adapters: synchronousAdapters(reactInput.adapters) });
    const vanilla = normalizeScene(vanillaInput, { adapters: StandardInputEmbedAdapters });

    expect(react.ir).toEqual(vanilla.ir);
    expect(react.ir.children[0]).toMatchObject({ data, dataExpand });
    expect(react.ir.children[1]).toMatchObject({ data: { value: data }, dataExpand });
    expect(renderToSvgString(reactInput.scene, { adapters: synchronousAdapters(reactInput.adapters) })).toEqual(
      renderToSvgString(vanillaInput, { adapters: StandardInputEmbedAdapters }),
    );
  },
);

it('preserves container labels in data and marker inputs with matching Vanilla output', () => {
  const label = { text: 'Container title' };
  const input = createInputScene(
    <>
      <Map data={{ values: [1, 2] }} label={label} />
      <Array label={[label, { text: 'Below', position: 'bottom' }]}>
        <ArrayItem text="cell" />
      </Array>
    </>,
  );
  const vanillaInput = scene({
    children: [
      map({ data: { values: [1, 2] }, label }),
      array({ items: [{ content: 'cell' }], label: [label, { text: 'Below', position: 'bottom' }] }),
    ],
  });
  const adapters = [ArrayInputEmbedAdapter, MapInputEmbedAdapter];

  expect(normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) }).ir).toEqual(
    normalizeScene(vanillaInput, { adapters }).ir,
  );

  const svg = renderToSvgString(input.scene, { adapters: synchronousAdapters(input.adapters) });

  expect(svg).toEqual(renderToSvgString(vanillaInput, { adapters }));
  expect(svg).toContain('Container title');
  expect(svg).toContain('Below');
});

it('骨架的格内外标号与 Map 键在 React 和 Vanilla 中等价', () => {
  const skeleton = { labels: ['x₁', '', 'x₁'] };
  const index = { labels: ['a', '', 'b'] };
  const layout = { width: 40, height: 30 };
  const react = createInputScene(
    <>
      <Array id="v" cellIdMode="index" skeleton={skeleton} index={index} layout={layout} />
      <Map skeleton={{ keys: ['k', '', 'k'] }} layout={layout} />
    </>,
  );
  const vanilla = scene({
    children: [
      array({ id: 'v', cellIdMode: 'index', skeleton, index, layout }),
      map({ skeleton: { keys: ['k', '', 'k'] }, layout }),
    ],
  });
  const adapters = react.adapters.filter(adapter => adapter.lower !== undefined);

  expect(adapters).toHaveLength(react.adapters.length);

  const normalized = normalizeScene(react.scene, { adapters });

  expect(normalized.ir).toEqual(normalizeScene(vanilla, { adapters: StandardInputEmbedAdapters }).ir);
  expect(renderToSvgString(react.scene, { adapters })).toEqual(
    renderToSvgString(vanilla, { adapters: StandardInputEmbedAdapters }),
  );
});
it('空 marker 保留格子与 Map 角色，显式空文字仍然保留', () => {
  const react = createInputScene(
    <>
      <Array>
        <ArrayItem id="slot" />
        <ArrayItem text="" />
      </Array>
      <Map>
        <MapEntry>
          <MapKey />
          <MapValue />
        </MapEntry>
      </Map>
    </>,
  );
  const vanilla = scene({
    children: [array({ items: [{ id: 'slot' }, { content: '' }] }), map({ entries: [{ key: {}, value: {} }] })],
  });
  const adapters = react.adapters.filter(adapter => adapter.lower !== undefined);

  expect(adapters).toHaveLength(react.adapters.length);

  const normalized = normalizeScene(react.scene, { adapters });

  expect(normalized.ir).toEqual(normalizeScene(vanilla, { adapters: StandardInputEmbedAdapters }).ir);
  expect(renderToSvgString(react.scene, { adapters })).toEqual(
    renderToSvgString(vanilla, { adapters: StandardInputEmbedAdapters }),
  );
});

import { createInputScene, Node } from '@retikz/react';
import { list, map, ListInputEmbedAdapter, MapInputEmbedAdapter } from '@retikz/standard-vanilla';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { List, ListItem, Map, MapEntry, MapKey, MapValue } from '../src';

const node = { type: 'node' as const, position: [0, 0] as [number, number], text: 'A' };
it('preserves mixed List string and object items across React and Vanilla', () => {
  const items = ['A', { content: 'B', id: 'custom', style: { fill: 'blue' } }];
  const input = createInputScene(<List items={items} />);
  const react = normalizeScene(input.scene, { adapters: input.adapters });
  const vanilla = normalizeScene(scene({ children: [list('list', { items })] }), { adapters: [ListInputEmbedAdapter] });
  expect(react.ir).toEqual(vanilla.ir);
  expect(react.ir.children[0]).toMatchObject({ items });
});
describe('List / Map adapter parity', () => {
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
            <List>
              <ListItem>
                <Node position={[0, 0]} text="A" />
              </ListItem>
            </List>
          </MapValue>
        </MapEntry>
      </Map>,
    );
    const react = normalizeScene(input.scene, { adapters: input.adapters });
    const vanilla = normalizeScene(
      scene({
        children: [
          map('map', {
            style: { fill: 'red', key: { fill: 'green' }, value: { fillOpacity: 0.3 } },
            layout: { padding: 0, key: { width: 60 }, value: { height: 40 } },
            entries: [
              {
                key: { content: node },
                value: { style: { fill: 'blue' }, content: list('list', { items: [{ content: node }] }) },
              },
            ],
          }),
        ],
      }),
      { adapters: [ListInputEmbedAdapter, MapInputEmbedAdapter] },
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
          map('map', {
            entries: [{ key: { content: '' }, value: { content: 'B', style: { fill: 'blue' } } }],
          }),
        ],
      }),
      { adapters: [MapInputEmbedAdapter] },
    );
    for (const input of [data, markers]) {
      const actual = normalizeScene(input.scene, { adapters: input.adapters });
      expect(actual.ir).toEqual(vanilla.ir);
      expect(actual.contributions).toEqual(vanilla.contributions);
    }
    expect(JSON.stringify(vanilla.ir)).toContain('"content":""');
  });
  it('preserves list data and marker styles, order, fragments and empty lists', () => {
    const data = createInputScene(
      <List items={[{ content: 'A' }, { content: 'B', id: 'b', style: { fillOpacity: 0 }, layout: { padding: 0 } }]} />,
    );
    const markers = createInputScene(
      <List>
        <>
          <ListItem text="A" />
          {false}
          <ListItem text="B" id="b" style={{ fillOpacity: 0 }} layout={{ padding: 0 }} />
        </>
      </List>,
    );
    expect(normalizeScene(data.scene, { adapters: data.adapters }).ir).toEqual(
      normalizeScene(markers.scene, { adapters: markers.adapters }).ir,
    );
    const empty = createInputScene(<List />);
    const emptyData = createInputScene(<List items={[]} />);
    expect(normalizeScene(empty.scene, { adapters: empty.adapters }).ir).toEqual(
      normalizeScene(emptyData.scene, { adapters: emptyData.adapters }).ir,
    );
  });
  it('rejects missing or multiple drawable children', () => {
    expect(() =>
      createInputScene(
        <List>
          <ListItem>{null}</ListItem>
        </List>,
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
        <List>
          <Node position={[0, 0]} />
        </List>,
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
    expect(() => createInputScene(<ListItem text="orphan" />)).toThrow(/direct child/);
  });
});

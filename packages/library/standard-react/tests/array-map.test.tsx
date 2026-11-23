import { createInputScene, Node } from '@retikz/react';
import { array, map } from '@retikz/standard-vanilla/collection';
import { compileToScene, normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { Array, ArrayItem, Map, MapEntry, MapKey, MapValue } from '../src/collection';

const node = { type: 'node' as const, position: [0, 0] as [number, number], text: 'A' };
it('通过两个适配器保留具有显式 JSX 单元 ID 和数据的索引标识', () => {
  const marker = createInputScene(
    <Array id="array" cellIdMode="index">
      <ArrayItem id="named" text="A" />
    </Array>,
  );
  const vanillaInput = scene({
    children: [array({ id: 'array', cellIdMode: 'index', items: [{ id: 'named', content: 'A' }] })],
  });

  expect(normalizeScene(marker).ir).toEqual(normalizeScene(vanillaInput).ir);
  expect(renderToSvgString(compileToScene(marker).scene)).toEqual(
    renderToSvgString(compileToScene(vanillaInput).scene),
  );

  const data = createInputScene(<Array id="data" cellIdMode="index" data={['A', 'A']} />);

  expect(normalizeScene(data).ir).toEqual(
    normalizeScene(scene({ children: [array({ id: 'data', cellIdMode: 'index', data: ['A', 'A'] })] })).ir,
  );
});
it('在 React 和 Vanilla 中保留混合的 Array 字符串和对象项', () => {
  const items = ['A', { content: 'B', id: 'custom', style: { fill: 'blue' } }];
  const input = createInputScene(<Array items={items} />);
  const react = normalizeScene(input);
  const vanilla = normalizeScene(scene({ children: [array({ items })] }));

  expect(react.ir).toEqual(vanilla.ir);
  expect(react.ir.children[0]).toMatchObject({ items });
});
it('保留 React 和 Vanilla 之间的字符串标识选项', () => {
  const items = ['A', 'B'];
  const input = createInputScene(<Array items={items} cellIdMode="string" />);
  const react = normalizeScene(input);
  const vanilla = normalizeScene(scene({ children: [array({ items, cellIdMode: 'string' })] }));

  expect(react.ir).toEqual(vanilla.ir);
  expect(react.ir.children[0]).toMatchObject({ items, cellIdMode: 'string' });
});
describe('Array / Map 适配器等价性', () => {
  it('通过项目、标记和 Vanilla 保留 Array 内容宽度', () => {
    const items = [{ content: 'A', layout: { width: 'content' as const } }, 'longer'];
    const fromItems = createInputScene(<Array items={items} defaultCell={{ layout: { width: 'content' } }} />);
    const fromMarkers = createInputScene(
      <Array defaultCell={{ layout: { width: 'content' } }}>
        <ArrayItem text="A" layout={{ width: 'content' }} />
        <ArrayItem text="longer" />
      </Array>,
    );
    const fromVanilla = normalizeScene(
      scene({ children: [array({ items, defaultCell: { layout: { width: 'content' } } })] }),
    );

    expect(normalizeScene(fromItems).ir).toEqual(fromVanilla.ir);

    const markerInput = normalizeScene(fromMarkers);
    const markerVanilla = normalizeScene(
      scene({
        children: [
          array({
            items: [{ content: 'A', layout: { width: 'content' } }, { content: 'longer' }],
            defaultCell: { layout: { width: 'content' } },
          }),
        ],
      }),
    );

    expect(markerInput.ir).toEqual(markerVanilla.ir);
  });

  it.each([
    true,
    false,
    {},
    { position: 'after' as const, start: 7, style: { font: { size: 24 }, textColor: 'red', opacity: 0.5 } },
  ])('保留跨适配器的索引配置：%j', index => {
    const items = ['A', 'B1'];
    const input = createInputScene(<Array items={items} index={index} />);
    const react = normalizeScene(input);
    const vanilla = normalizeScene(scene({ children: [array({ items, index })] }));

    expect(react.ir).toEqual(vanilla.ir);
    expect(react.ir.children[0]).toMatchObject({ index });
    expect(react.contributions).toEqual(vanilla.contributions);
  });

  it('在 React 和 Vanilla 中同样保留嵌套提供者、样式和稀疏 IR', () => {
    const input = createInputScene(
      <Map
        defaultCell={{
          style: { fill: 'red' },
          layout: { padding: 0 },
          key: { style: { fill: 'green' }, layout: { width: 60 } },
          value: { style: { opacity: { fill: 0.3 } }, layout: { height: 40 } },
        }}
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
    const react = normalizeScene(input);
    const vanilla = normalizeScene(
      scene({
        children: [
          map({
            entries: [
              {
                key: { content: node },
                value: { style: { fill: 'blue' }, content: array({ items: [{ content: node }] }) },
              },
            ],
            defaultCell: {
              style: { fill: 'red' },
              layout: { padding: 0 },
              key: { style: { fill: 'green' }, layout: { width: 60 } },
              value: { style: { opacity: { fill: 0.3 } }, layout: { height: 40 } },
            },
          }),
        ],
      }),
    );

    expect(react.ir.children[0]).toMatchObject({
      defaultCell: {
        key: { style: { fill: 'green' }, layout: { width: 60 } },
        value: { style: { opacity: { fill: 0.3 } }, layout: { height: 40 } },
      },
    });
    expect(react.ir).toEqual(vanilla.ir);
    expect(react.contributions).toEqual(vanilla.contributions);
  });

  it('生成相同的文本 IR 以及数据、标记和 Vanilla 的贡献', () => {
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
    );

    for (const input of [data, markers]) {
      const actual = normalizeScene(input);

      expect(actual.ir).toEqual(vanilla.ir);
      expect(actual.contributions).toEqual(vanilla.contributions);
    }

    expect(JSON.stringify(vanilla.ir)).toContain('"content":""');
  });

  it('保留数组数据和标记样式、顺序、片段和空列表', () => {
    const data = createInputScene(
      <Array
        items={[{ content: 'A' }, { content: 'B', id: 'b', style: { opacity: { fill: 0 } }, layout: { padding: 0 } }]}
      />,
    );
    const markers = createInputScene(
      <Array>
        <>
          <ArrayItem text="A" />
          {false}
          <ArrayItem text="B" id="b" style={{ opacity: { fill: 0 } }} layout={{ padding: 0 }} />
        </>
      </Array>,
    );

    expect(normalizeScene(data).ir).toEqual(normalizeScene(markers).ir);

    const empty = createInputScene(<Array />);
    const emptyData = createInputScene(<Array items={[]} />);

    expect(normalizeScene(empty).ir).toEqual(normalizeScene(emptyData).ir);
  });

  it('拒绝丢失或多个可绘制子项', () => {
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

  it('拒绝格式错误的标记拓扑以及不完整或重复的 Map 槽位', () => {
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

it('通过 React 和 Vanilla 传递混合的 JSON 数据，具有相同的贡献', () => {
  const data = { id: 'ordinary data', values: ['', '', null, { enabled: false }] };
  const input = createInputScene(<Map data={data} defaultCell={{ value: { layout: { width: 70 } } }} />);
  const react = normalizeScene(input);
  const vanilla = normalizeScene(
    scene({ children: [map({ data, defaultCell: { value: { layout: { width: 70 } } } })] }),
  );

  expect(react.ir).toEqual(vanilla.ir);
  expect(react.contributions).toEqual(vanilla.contributions);
  expect(react.ir.children[0]).toMatchObject({ data });
  expect(react.ir.children[0]).not.toHaveProperty('entries');

  const listInput = createInputScene(<Array data={['', '', data]} />);
  const reactArray = normalizeScene(listInput);
  const vanillaArray = normalizeScene(scene({ children: [array({ data: ['', '', data] })] }));

  expect(reactArray.ir).toEqual(vanillaArray.ir);
  expect(reactArray.contributions).toEqual(vanillaArray.contributions);
  expect(renderToSvgString(compileToScene(input).scene)).toEqual(
    renderToSvgString(
      compileToScene(scene({ children: [map({ data, defaultCell: { value: { layout: { width: 70 } } } })] })).scene,
    ),
  );
});

it.each([false, [], ['map'], ['array']] as const)('保留数据扩展 %j 到 React 和 Vanilla', selection => {
  const dataExpand = typeof selection === 'boolean' ? selection : [...selection];
  const data = [{ a: 1 }, [{ b: true }]];
  const reactInput = createInputScene(
    <>
      <Array data={data} dataExpand={dataExpand} />
      <Map data={{ value: data }} dataExpand={dataExpand} />
    </>,
  );
  const vanillaInput = scene({ children: [array({ data, dataExpand }), map({ data: { value: data }, dataExpand })] });
  const react = normalizeScene(reactInput);
  const vanilla = normalizeScene(vanillaInput);

  expect(react.ir).toEqual(vanilla.ir);
  expect(react.ir.children[0]).toMatchObject({ data, dataExpand });
  expect(react.ir.children[1]).toMatchObject({ data: { value: data }, dataExpand });
  expect(renderToSvgString(compileToScene(reactInput).scene)).toEqual(
    renderToSvgString(compileToScene(vanillaInput).scene),
  );
});

it('保留数据和标记输入中的容器标签以及匹配的 Vanilla 输出', () => {
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

  expect(normalizeScene(input).ir).toEqual(normalizeScene(vanillaInput).ir);

  const compileResult = compileToScene(input);
  const svg = renderToSvgString(compileResult.scene);

  expect(svg).toEqual(renderToSvgString(compileToScene(vanillaInput).scene));
  expect(svg).toContain('Container title');
  expect(svg).toContain('Below');
});

it('骨架的格内外标号与 Map 键在 React 和 Vanilla 中等价', () => {
  const skeleton = { labels: ['x₁', '', 'x₁'] };
  const index = { labels: ['a', '', 'b'] };
  const layout = { width: 40, height: 30 };
  const react = createInputScene(
    <>
      <Array id="v" cellIdMode="index" skeleton={skeleton} index={index} defaultCell={{ layout }} />
      <Map skeleton={{ keys: ['k', '', 'k'] }} defaultCell={{ layout }} />
    </>,
  );
  const vanilla = scene({
    children: [
      array({ id: 'v', cellIdMode: 'index', skeleton, index, defaultCell: { layout } }),
      map({ skeleton: { keys: ['k', '', 'k'] }, defaultCell: { layout } }),
    ],
  });

  const normalized = normalizeScene(react);

  expect(normalized.ir).toEqual(normalizeScene(vanilla).ir);
  expect(renderToSvgString(compileToScene(react).scene)).toEqual(renderToSvgString(compileToScene(vanilla).scene));
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

  const normalized = normalizeScene(react);

  expect(normalized.ir).toEqual(normalizeScene(vanilla).ir);
  expect(renderToSvgString(compileToScene(react).scene)).toEqual(renderToSvgString(compileToScene(vanilla).scene));
});

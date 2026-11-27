import { convertReactToInputScene, Node } from '@retikz/react';
import { matrix } from '@retikz/standard-vanilla/collection';
import { compileToScene, normalizeScene, renderToSvg, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { Matrix, MatrixRow, MatrixCell, Map, Array } from '../src/collection';

it('JSX 行保留空单元格和具有 Vanilla 等价性的显式别名', () => {
  const jsx = convertReactToInputScene(
    <Matrix id="m" cellIdMode="index">
      <>
        <MatrixRow>
          <MatrixCell text="x" id="named" />
          <MatrixCell />
        </MatrixRow>
        {null}
        <MatrixRow>
          <MatrixCell text="y" />
          <MatrixCell text="" />
        </MatrixRow>
      </>
    </Matrix>,
  );
  const vanilla = scene({
    children: [
      matrix({
        id: 'm',
        cellIdMode: 'index',
        items: [
          [{ content: 'x', id: 'named' }, {}],
          [{ content: 'y' }, { content: '' }],
        ],
      }),
    ],
  });

  expect(normalizeScene(jsx).ir).toEqual(normalizeScene(vanilla).ir);
  expect(renderToSvg(compileToScene(jsx).scene)).toEqual(renderToSvg(compileToScene(vanilla).scene));
});
it('自动收集嵌套的 Matrix、Array、Map 和裁剪提供者', () => {
  const jsx = convertReactToInputScene(
    <Matrix defaultCell={{ layout: { width: 80, height: 50 } }}>
      <MatrixRow>
        <MatrixCell>
          <Map data={{ a: [1, 2] }} />
        </MatrixCell>
        <MatrixCell>
          <Array items={['v']} />
        </MatrixCell>
      </MatrixRow>
      <MatrixRow>
        <MatrixCell>
          <Matrix skeleton={{ rows: 1, columns: 2 }} />
        </MatrixCell>
        <MatrixCell>
          <Node text="node" position={[0, 0]} />
        </MatrixCell>
      </MatrixRow>
    </Matrix>,
  );

  expect(renderToSvg(compileToScene(jsx).scene)).toContain('<svg');
});
it('空 React 输入和所有三个显式输入均进行编译', () => {
  for (const element of [
    <Matrix />,
    <Matrix items={[]} />,
    <Matrix data={[[{ a: [1] }]]} />,
    <Matrix skeleton={{ labels: [['x', '']] }} />,
  ]) {
    const jsx = convertReactToInputScene(element);

    expect(renderToSvg(compileToScene(jsx).scene)).toContain('<svg');
  }
});
it('拒绝放错位置的标记、多个可绘制子项和参差不齐的行', () => {
  for (const element of [
    <Matrix>
      <MatrixCell />
    </Matrix>,
    <Matrix>
      <MatrixRow>
        <Node position={[0, 0]} />
      </MatrixRow>
    </Matrix>,
    <Matrix>
      <MatrixRow>
        <MatrixCell>
          <Node position={[0, 0]} />
          <Node position={[0, 0]} />
        </MatrixCell>
      </MatrixRow>
    </Matrix>,
  ])
    expect(() => convertReactToInputScene(element)).toThrow();

  const jsx = convertReactToInputScene(
    <Matrix>
      <MatrixRow>
        <MatrixCell />
      </MatrixRow>
      <MatrixRow />
    </Matrix>,
  );

  expect(() => renderToSvg(compileToScene(jsx).scene)).toThrow();
});

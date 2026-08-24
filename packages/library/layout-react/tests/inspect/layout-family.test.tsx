import type { InspectionCompileResult } from '@retikz/inspect';
import type { ReactNode } from 'react';

import { createLayoutInspectionVanillaDriver } from '@retikz/layout-vanilla/inspect';
import { createInputScene, Node } from '@retikz/react';
import { normalizeScene, prepareStaticProcessing } from '@retikz/vanilla';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FlexLayout, LayoutItem } from '../../src';
import { InspectFlexLayout, InspectGridLayout, LayoutInspectLayout, LayoutInspectScope } from '../../src/inspect';

/** 通过 Vanilla processing 处理 React 输入并返回已提交的 Inspect 结果 */
const inspectReactInput = (children: ReactNode): InspectionCompileResult | undefined => {
  const input = createInputScene(children);
  let committed: InspectionCompileResult | undefined;
  const processing = prepareStaticProcessing(
    input.scene,
    {
      adapters: input.adapters,
      compile: { padding: 0 },
      compileDriver: createLayoutInspectionVanillaDriver({
        onCommit: result => {
          committed = result;
        },
      }),
    },
    0,
  );
  processing.commit();
  return committed;
};

describe('@retikz/layout-react/inspect', () => {
  it('通过可选 wrapper 输出 FlexLayout 只读辅助图层', () => {
    const html = renderToStaticMarkup(
      <LayoutInspectLayout runtime={{ mode: 'static' }}>
        <InspectFlexLayout inspect={{ gaps: false }}>
          <LayoutItem kind="flex" itemKey="leaf">
            <Node position={[0, 0]} text="leaf" />
          </LayoutItem>
        </InspectFlexLayout>
      </LayoutInspectLayout>,
    );
    expect(html).toContain('data-retikz-readonly-layer');
    expect(html).toContain('hsl(210, 38%, 48%)');
  });

  it.each([
    [
      'different family',
      <InspectGridLayout key="nested" columns={[{ kind: 'fixed', value: 20 }]}>
        <LayoutItem kind="grid" itemKey="leaf">
          <Node position={[0, 0]} text="leaf" />
        </LayoutItem>
      </InspectGridLayout>,
      'gridLayout',
    ],
    [
      'same family',
      <InspectFlexLayout key="nested">
        <LayoutItem kind="flex" itemKey="leaf">
          <Node position={[0, 0]} text="leaf" />
        </LayoutItem>
      </InspectFlexLayout>,
      'flexLayout',
    ],
  ])('只选择嵌套的 $0 occurrence', (_label, nested, expectedType) => {
    const children = (
      <FlexLayout>
        <LayoutItem kind="flex" itemKey="nested">
          {nested}
        </LayoutItem>
      </FlexLayout>
    );
    const input = createInputScene(children);
    const normalized = normalizeScene(input.scene, { adapters: input.adapters });
    expect(
      normalized.authoringSites
        .filter(site => site.kind === 'embeddable')
        .map(site => ({ sourcePath: site.sourcePath, owner: site.owner, authoring: site.authoring })),
    ).toEqual([
      {
        sourcePath: 'children[0]',
        owner: { kind: 'composite', namespace: 'layout', type: 'flexLayout' },
        authoring: undefined,
      },
      {
        sourcePath: 'children[0]',
        owner: { kind: 'composite', namespace: 'layout', type: expectedType },
        authoring: expect.any(Object),
      },
    ]);

    const entries = inspectReactInput(children)?.inspection?.entries;
    expect(entries?.length).toBeGreaterThan(0);
    expect(entries?.every(entry => entry.owner.kind === 'composite' && entry.owner.type === expectedType)).toBe(true);
    expect(entries?.every(entry => entry.occurrence.expansionPath.length > 0)).toBe(true);
    expect(new Set(entries?.map(entry => entry.colorScope))).toEqual(new Set([0]));
  });

  it('贡献内部 Scope 无法定位时明确拒绝，避免误选择父布局', () => {
    const input = createInputScene(
      <FlexLayout>
        <LayoutItem kind="flex" itemKey="nested">
          <LayoutInspectScope request={false}>
            <InspectFlexLayout>
              <LayoutItem kind="flex" itemKey="leaf">
                <Node position={[0, 0]} text="leaf" />
              </LayoutItem>
            </InspectFlexLayout>
          </LayoutInspectScope>
        </LayoutItem>
      </FlexLayout>,
    );

    expect(() =>
      prepareStaticProcessing(
        input.scene,
        {
          adapters: input.adapters,
          compile: { padding: 0 },
          compileDriver: createLayoutInspectionVanillaDriver(),
        },
        0,
      ),
    ).toThrow(/nested Scope/i);
  });
});

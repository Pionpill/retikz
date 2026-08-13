import type { InspectionCompileResult } from '@retikz/inspect';

import { createInspectorRegistry } from '@retikz/inspect';
import { createInspectionLayoutDriver } from '@retikz/inspect/react';
import { FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition } from '@retikz/layout';
import { FLEX_LAYOUT_INSPECTOR, GRID_LAYOUT_INSPECTOR, OVERLAY_LAYOUT_INSPECTOR } from '@retikz/layout/inspect';
import { buildIRWithContributions, compileLayoutWithDriver, Node } from '@retikz/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FlexLayout, LayoutItem } from '../../src';
import { InspectFlexLayout, InspectGridLayout, LayoutInspectLayout, LayoutInspectScope } from '../../src/inspect';

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
    expect(html).toContain('#2563eb');
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
    const built = buildIRWithContributions(
      <FlexLayout>
        <LayoutItem kind="flex" itemKey="nested">
          {nested}
        </LayoutItem>
      </FlexLayout>,
    );
    expect(
      built.authoringSites
        .filter(site => site.kind === 'embeddable')
        .map(site => ({
          sourcePath: site.sourcePath,
          owner: site.owner,
          authoring: Reflect.get(site.props, 'authoring'),
        })),
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
    let committed: InspectionCompileResult | undefined;
    const driver = createInspectionLayoutDriver({
      registry: createInspectorRegistry([FLEX_LAYOUT_INSPECTOR, GRID_LAYOUT_INSPECTOR, OVERLAY_LAYOUT_INSPECTOR]),
      onCommit: result => (committed = result),
    });
    const driverInput = {
      instance: {},
      source: built.ir,
      authoringSites: built.authoringSites,
      coreOptions: { composites: [FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition], padding: 0 },
    } as const;
    const session = driver.create(driverInput);
    const observer = session.observers[0].createSession();
    expect(
      observer.select({
        owner: { kind: 'composite', namespace: 'layout', type: expectedType },
        sourcePath: 'children[0]',
      }),
    ).toBe(true);
    const output = compileLayoutWithDriver(driverInput, session);
    session.commit?.(output);
    const entries = committed?.inspection?.entries;
    expect(entries?.length).toBeGreaterThan(0);
    expect(entries?.every(entry => entry.owner.kind === 'composite' && entry.owner.type === expectedType)).toBe(true);
    expect(entries?.every(entry => entry.occurrence.expansionPath.length > 0)).toBe(true);
    expect(new Set(entries?.map(entry => entry.colorScope))).toEqual(new Set([0]));
  });

  it('贡献内部 Scope 检查无法定位时明确拒绝，避免误选父布局', () => {
    const built = buildIRWithContributions(
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
    const driver = createInspectionLayoutDriver({
      registry: createInspectorRegistry([FLEX_LAYOUT_INSPECTOR]),
    });
    const session = driver.create({
      instance: {},
      source: built.ir,
      authoringSites: built.authoringSites,
      coreOptions: { composites: [FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition], padding: 0 },
    });

    expect(() => session.observers[0]?.createSession()).toThrow(/nested Scope/i);
  });
});

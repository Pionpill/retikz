import { EntityRole, GraphStatus } from '@retikz/graph';
import type { FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlContract, PreviewControlValues } from '@/modules/docs/components/component-preview';
import { PreviewControlStateContext } from '@/modules/docs/components/component-preview/context';
import { getPreviewControlFields, isPreviewControlVisible } from '@/modules/docs/components/component-preview/controls';
import { PreviewThemeProvider } from '@/modules/docs/components/component-preview/theme';
import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import EntityDefinition, {
  previewSource as definitionSource,
} from '@/modules/docs/contents/schematic/graph/entity/custom/entity-definition';
import {
  createPreviewControlContract as createDefinitionContract,
  previewControlContract as definitionContract,
} from '@/modules/docs/contents/schematic/graph/entity/custom/entity-definition.controls';
import EntityPlayground, {
  previewSource,
} from '@/modules/docs/contents/schematic/graph/entity/usage/entity-playground';
import {
  createPreviewControlContract,
  previewControlContract,
} from '@/modules/docs/contents/schematic/graph/entity/usage/entity-playground.controls';
import EntityStyleSize, {
  previewSource as styleSizeSource,
} from '@/modules/docs/contents/schematic/graph/entity/usage/entity-style-size';
import {
  createPreviewControlContract as createStyleSizeContract,
  previewControlContract as styleSizeContract,
} from '@/modules/docs/contents/schematic/graph/entity/usage/entity-style-size.controls';

/** 用真实渲染链验证 controls，而非只比较控件声明 */
const renderWithValues = (
  Demo: FC,
  contract: PreviewControlContract,
  values: Readonly<PreviewControlValues>,
  lang: 'zh' | 'en' = 'zh',
) =>
  renderToStaticMarkup(
    <PreviewThemeProvider theme={{ mode: 'light' }}>
      <PreviewControlStateContext.Provider
        value={{
          canonicalValues: contract.canonicalValues,
          values,
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        }}
      >
        {lang === 'en' && Demo === EntityPlayground ? (
          <EntityPlayground lang="en" />
        ) : lang === 'en' && Demo === EntityStyleSize ? (
          <EntityStyleSize lang="en" />
        ) : (
          <Demo />
        )}
      </PreviewControlStateContext.Provider>
    </PreviewThemeProvider>,
  );

describe('Entity role and style playground', () => {
  it('双语共享语义值，覆盖全部内置角色与状态，不泄漏站点私有 kind', () => {
    const zh = createPreviewControlContract('zh');
    const en = createPreviewControlContract('en');
    expect(en.canonicalValues).toEqual(zh.canonicalValues);
    expect(en.relatedApis).toEqual(zh.relatedApis);
    for (const contract of [zh, en]) {
      const fields = getPreviewControlFields(contract.controls);
      const role = fields.find(field => field.id === 'role');
      const status = fields.find(field => field.id === 'status');
      expect(role?.kind === 'select' && role.options.map(option => option.value)).toEqual(Object.values(EntityRole));
      expect(status?.kind === 'select' && status.options.map(option => option.value)).toEqual([
        '',
        ...Object.values(GraphStatus),
      ]);
      expect(fields.find(field => field.id === 'group')).toMatchObject({ kind: 'switch', defaultValue: false });
      expect(fields.some(field => field.id === 'kind')).toBe(false);
      const color = fields.find(field => field.id === 'color');
      expect(isPreviewControlVisible(color?.visibleWhen, contract.canonicalValues)).toBe(false);
      expect(isPreviewControlVisible(color?.visibleWhen, { ...contract.canonicalValues, override: true })).toBe(true);
    }
  });

  it('分组开关使分组色覆盖状态色，显式主色仍优先', () => {
    const statusValues = { ...previewControlContract.canonicalValues, status: 'error' };
    const statusOnly = renderWithValues(EntityPlayground, previewControlContract, statusValues);
    const grouped = renderWithValues(EntityPlayground, previewControlContract, { ...statusValues, group: true });
    const statusStroke = statusOnly.match(/stroke="([^"]+)"/u)?.[1];
    const groupStroke = grouped.match(/stroke="([^"]+)"/u)?.[1];

    expect(statusStroke).toBeDefined();
    expect(groupStroke).toBeDefined();
    expect(groupStroke).not.toBe(statusStroke);
    expect(
      renderWithValues(EntityPlayground, previewControlContract, {
        ...statusValues,
        group: true,
        override: true,
      }),
    ).toContain('stroke="#2563eb"');
    expect(renderWithValues(EntityPlayground, previewControlContract, { ...statusValues, group: false })).toBe(
      statusOnly,
    );
  });

  it('七个角色均可绘制；状态改变 SVG，显式主色覆盖语义色且关闭后恢复', () => {
    for (const role of Object.values(EntityRole)) {
      const values = { ...previewControlContract.canonicalValues, role };
      const baseline = renderWithValues(EntityPlayground, previewControlContract, values);
      expect(baseline).toContain('<svg');
      expect(baseline).toMatch(/fill="(?!none")[^"]+"/u);
      for (const status of Object.values(GraphStatus)) {
        const markup = renderWithValues(EntityPlayground, previewControlContract, { ...values, status });
        expect(markup).not.toBe(baseline);
        if (status === 'disabled') expect(markup).toContain('stroke-dasharray');
        const overridden = renderWithValues(EntityPlayground, previewControlContract, {
          ...values,
          status,
          override: true,
          color: '#2563eb',
        });
        expect(overridden).toContain('stroke="#2563eb"');
      }
      expect(renderWithValues(EntityPlayground, previewControlContract, { ...values, color: '#ff0000' })).toBe(
        baseline,
      );
    }
  });

  it('保持固定视口与可读的双语默认文字，Source 不物化状态或站点主题', () => {
    const ir = buildPreviewIR(() => previewSource.canonicalRender?.() ?? null).ir;
    expect(ir.viewBox).toEqual({ x: 0, y: 0, width: 360, height: 180 });
    expect(ir.children[0]).toMatchObject({
      children: [
        {
          namespace: 'graph',
          type: 'entity',
          role: 'activity',
          position: [180, 90],
          text: '订单',
        },
      ],
    });
    expect(JSON.stringify(ir)).not.toContain('docs.logic');
    expect(JSON.stringify(ir)).not.toContain('"status"');
    expect(JSON.stringify(ir)).not.toContain('"group"');
    expect(
      renderWithValues(EntityPlayground, previewControlContract, previewControlContract.canonicalValues, 'en'),
    ).toContain('Order');
  });
});

describe('Entity style and size playground', () => {
  it('双语使用相同默认值，六个控件均映射到公开样式和排布字段', () => {
    const en = createStyleSizeContract('en');
    expect(en.canonicalValues).toEqual(styleSizeContract.canonicalValues);
    expect(en.relatedApis).toEqual(styleSizeContract.relatedApis);
    expect(getPreviewControlFields(en.controls).map(field => field.id)).toEqual([
      'color',
      'fill',
      'strokeWidth',
      'maxTextWidth',
      'lineHeight',
      'minimumWidth',
    ]);
  });

  it('样式与排布控件改变绘制结果，Source 保留规范默认值', () => {
    const baseline = renderWithValues(EntityStyleSize, styleSizeContract, styleSizeContract.canonicalValues);
    expect(baseline).toContain('stroke="#2563eb"');
    expect(
      renderWithValues(EntityStyleSize, styleSizeContract, { ...styleSizeContract.canonicalValues, color: '#dc2626' }),
    ).toContain('stroke="#dc2626"');
    for (const [field, value] of [
      ['fill', 0.6],
      ['strokeWidth', 6],
      ['maxTextWidth', 80],
      ['lineHeight', 30],
      ['minimumWidth', 300],
    ] as const) {
      expect(
        renderWithValues(EntityStyleSize, styleSizeContract, { ...styleSizeContract.canonicalValues, [field]: value }),
      ).not.toBe(baseline);
    }
    const ir = buildPreviewIR(() => styleSizeSource.canonicalRender?.() ?? null).ir;
    expect(ir.children[0]).toMatchObject({
      children: [
        {
          role: 'activity',
          style: { color: '#2563eb', fill: 0.12, strokeWidth: 2 },
          layout: { maxTextWidth: 140, lineHeight: 18, minimumSize: { width: 160 } },
        },
      ],
    });
    expect(renderWithValues(EntityStyleSize, styleSizeContract, styleSizeContract.canonicalValues, 'en')).toContain(
      'Check the order',
    );
  });
});

describe('Entity custom predicate playground', () => {
  it('双语参数契约一致，predicate 规则按参数计算颜色并独立叠加描边', () => {
    expect(createDefinitionContract('en').canonicalValues).toEqual(definitionContract.canonicalValues);
    expect(createDefinitionContract('en').relatedApis).toEqual(definitionContract.relatedApis);
    for (const [status, color] of Object.entries({ available: '#16a34a', degraded: '#d97706', offline: '#dc2626' })) {
      for (const critical of [false, true]) {
        const markup = renderWithValues(EntityDefinition, definitionContract, { status, critical });
        expect(markup).toContain(`stroke="${color}"`);
        if (critical) expect(markup).toContain('stroke-width="3"');
      }
    }
  });

  it('Source 保留 predicate 输入与固定规则，实体本身不直接写颜色', () => {
    const ir = buildPreviewIR(() => definitionSource.canonicalRender?.() ?? null).ir;
    expect(ir.viewBox).toEqual({ x: 0, y: 0, width: 420, height: 180 });
    expect(ir.children[0]).toMatchObject({
      graphRules: expect.arrayContaining([
        expect.objectContaining({
          selector: { predicate: { name: 'service.availability', params: { critical: true } } },
          style: { strokeWidth: 3 },
        }),
      ]),
      children: [
        {
          namespace: 'graph',
          type: 'entity',
          id: 'gateway',
          role: 'service',
          kind: 'service.gateway',
          predicate: { name: 'service.availability', params: { status: 'available', critical: false } },
          position: [210, 90],
          text: 'API 网关',
        },
      ],
    });
  });
});

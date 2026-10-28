import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import i18n from '@/i18n';
import { parseSchemaPath, SCHEMA_REGISTRY, serializeSchemaPath, ZodSchema } from '@/modules/docs/components';

const DeepSchema = z.strictObject({
  'meta./[]<>=~': z.strictObject({
    rows: z.array(
      z.discriminatedUnion('kind', [
        z.strictObject({ kind: z.literal(['1', 'one']), label: z.string().describe('Source label.') }),
        z.strictObject({ kind: z.literal(1), value: z.number().describe('Source value.') }),
      ]),
    ),
    tuple: z.tuple([z.strictObject({ flag: z.boolean().describe('Source flag.') }), z.string()]),
    plain: z.union([z.strictObject({ left: z.string().describe('Source left.') }), z.number()]),
  }),
});

const entryName = 'DeepSchemaFixture';

const entry = {
  schema: DeepSchema,
  label: 'DeepSchemaFixture',
  url: '/fixture#deep-schema-fixture',
};

const AliasSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('a'), nested: z.strictObject({ value: z.string().describe('Alias value.') }) }),
  z.strictObject({ kind: z.literal('b'), count: z.number().describe('Alias count.') }),
]);

const aliasEntryName = 'DeepAliasSchemaFixture';

const field = (key: string) => ({ kind: 'field' as const, key });

const caseOf = (value: string | number) => ({
  kind: 'case' as const,
  discriminator: 'kind',
  value,
});

beforeEach(async () => {
  await i18n.changeLanguage('zh');
});

afterEach(() => {
  delete SCHEMA_REGISTRY[entryName];
  delete SCHEMA_REGISTRY[aliasEntryName];
  vi.restoreAllMocks();
});

describe('ZodSchema 深度扩展', () => {
  it('Array 的超长 items 类型只显示所属 Schema 字段路径', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ZodSchema name="ArraySchema" expandNested />
      </MemoryRouter>,
    );
    const itemsRow = markup.split('<tr').find(row => row.includes('>items<'));

    expect(itemsRow).toContain('ArraySchema.items');
    expect(itemsRow).not.toContain('展开 / 收起类型');
    expect(markup).not.toContain('aria-label="展开 / 收起类型"');
  });

  it('将带默认值的 Node position 展示为可省略，Coordinate position 仍必填', () => {
    const render = (name: string) =>
      renderToStaticMarkup(
        <MemoryRouter>
          <ZodSchema name={name} />
        </MemoryRouter>,
      );
    const positionRow = (markup: string) => markup.split('<tr').find(row => row.includes('>position<'));
    const nodeRow = positionRow(render('NodeSchema'));
    const coordinateRow = positionRow(render('CoordinateSchema'));

    expect(nodeRow).toBeDefined();
    expect(nodeRow).not.toContain('✓');
    expect(coordinateRow).toContain('✓');
  });

  it('将 JsonObjectSchema 呈现为字符串键控的 JsonValue 记录', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ZodSchema name="JsonObjectSchema" />
      </MemoryRouter>,
    );

    expect(markup).toContain('Record&lt;');
    expect(markup).toContain('JsonValue');
    expect(markup).not.toContain('unhandled: record');
  });

  it('往返类型化路径，不会与保留键和判别字段类型发生冲突', () => {
    const paths = [
      [field('meta./[]<>=~'), field('rows'), { kind: 'array' as const }, caseOf('1'), field('label')],
      [field('meta./[]<>=~'), field('rows'), { kind: 'array' as const }, caseOf(1), field('value')],
      [field('meta./[]<>=~'), field('tuple'), { kind: 'tuple' as const, index: 0 }, field('flag')],
      [field('meta./[]<>=~'), field('plain'), { kind: 'union' as const, index: 0 }, field('left')],
    ];
    const serialized = paths.map(path => serializeSchemaPath(path));

    expect(new Set(serialized).size).toBe(serialized.length);

    serialized.forEach((path, index) => expect(parseSchemaPath(path)).toEqual(paths[index]));
  });

  it('使用规范描述覆盖来渲染数组、元组和联合分支', () => {
    SCHEMA_REGISTRY[entryName] = entry;
    const labelPath = serializeSchemaPath([
      field('meta./[]<>=~'),
      field('rows'),
      { kind: 'array' },
      caseOf('1'),
      field('label'),
    ]);
    const valuePath = serializeSchemaPath([
      field('meta./[]<>=~'),
      field('rows'),
      { kind: 'array' },
      caseOf(1),
      field('value'),
    ]);
    const flagPath = serializeSchemaPath([
      field('meta./[]<>=~'),
      field('tuple'),
      { kind: 'tuple', index: 0 },
      field('flag'),
    ]);
    const leftPath = serializeSchemaPath([
      field('meta./[]<>=~'),
      field('plain'),
      { kind: 'union', index: 0 },
      field('left'),
    ]);

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ZodSchema
          name={entryName}
          expandNested
          descriptions={{
            [serializeSchemaPath([field('meta./[]<>=~')])]: '元数据。',
            [serializeSchemaPath([field('meta./[]<>=~'), field('rows')])]: '行。',
            [labelPath]: '标签。',
            [valuePath]: '数值。',
            [serializeSchemaPath([field('meta./[]<>=~'), field('tuple')])]: '元组。',
            [flagPath]: '标记。',
            [serializeSchemaPath([field('meta./[]<>=~'), field('plain')])]: '普通联合。',
            [leftPath]: '左值。',
          }}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain('case kind: &quot;1&quot; | &quot;one&quot;');
    expect(markup).toContain('case kind: 1');
    expect(markup).toContain('tuple[0]');
    expect(markup).toContain('union[0]');
    expect(markup).not.toContain('union[1]');
    expect(markup).not.toContain('tuple[1]');

    for (const translation of ['标签。', '数值。', '标记。', '左值。']) expect(markup).toContain(translation);
  });

  it('保持仅值联合内联并仅扩展混合联合的对象分支', () => {
    SCHEMA_REGISTRY[entryName] = {
      ...entry,
      schema: z.strictObject({
        order: z.union([z.enum(['ascending', 'descending']), z.string(), z.array(z.union([z.string(), z.number()]))]),
        mixed: z.union([z.string(), z.array(z.strictObject({ label: z.string() }))]),
        named: z.union([z.string(), SCHEMA_REGISTRY.DataReferenceSchema.schema]),
      }),
    };
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ZodSchema name={entryName} expandNested />
      </MemoryRouter>,
    );
    expect(markup.match(/union\[1\]/g)).toHaveLength(1);
    expect(markup).not.toContain('union[0]');
    expect(markup).not.toContain('union[2]');
    expect(markup).toContain('ascending');
    expect(markup).toContain('descending');
    expect(markup).toContain('>label<');
    expect(markup).toContain('DataReferenceSchema');
    expect(markup).not.toContain('>reference<');
  });

  it('将纯值根联合呈现为类型而不是空表', () => {
    SCHEMA_REGISTRY[entryName] = { ...entry, schema: z.union([z.string(), z.number()]) };
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ZodSchema name={entryName} expandNested />
      </MemoryRouter>,
    );
    expect(markup).not.toContain('<table');
    expect(markup).toContain('string');
    expect(markup).toContain('number');
  });

  it('警告格式错误、输入错误和缺少深度描述路径', () => {
    SCHEMA_REGISTRY[entryName] = entry;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const wrongTypedSelector = serializeSchemaPath([
      field('meta./[]<>=~'),
      field('rows'),
      { kind: 'array' },
      caseOf('1'),
      field('value'),
    ]);

    renderToStaticMarkup(
      <MemoryRouter>
        <ZodSchema
          name={entryName}
          expandNested
          descriptions={{ '/field/~2bad': '坏路径。', [wrongTypedSelector]: '错分支。' }}
        />
      </MemoryRouter>,
    );

    expect(warn.mock.calls.flat().join('\n')).toMatch(/invalid description path|has no field path|no override/);
  });

  it('扩展顶级可判别联合，而不是将其折叠为紧凑别名', () => {
    SCHEMA_REGISTRY[aliasEntryName] = {
      schema: AliasSchema,
      label: 'DeepAliasSchemaFixture',
      url: '/fixture#deep-alias-schema-fixture',
    };
    const valuePath = serializeSchemaPath([caseOf('a'), field('nested'), field('value')]);
    const countPath = serializeSchemaPath([caseOf('b'), field('count')]);

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ZodSchema
          name={aliasEntryName}
          expandNested
          descriptions={{
            [serializeSchemaPath([caseOf('a'), field('kind')])]: '甲类。',
            [serializeSchemaPath([caseOf('a'), field('nested')])]: '嵌套。',
            [valuePath]: '内容。',
            [serializeSchemaPath([caseOf('b'), field('kind')])]: '乙类。',
            [countPath]: '数量。',
          }}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain('case kind: &quot;a&quot;');
    expect(markup).toContain('case kind: &quot;b&quot;');
    expect(markup).toContain('内容。');
    expect(markup).toContain('数量。');
  });

  it('使用注册表拥有的中文描述覆盖每个可见的 Legend 输入和产物路径', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ZodSchema name="LegendSchema" expandNested />
        <ZodSchema name="LegendArtifactSchema" expandNested />
      </MemoryRouter>,
    );

    expect(warn.mock.calls.flat().join('\n')).not.toMatch(/invalid description path|has no field path|no override/);

    for (const translation of [
      '按稳定编写顺序保存的离散图例条目',
      '沿样本主轴的归一化编写位置',
      '相对 slot 与容器裁切的可观察溢出状态',
      '由样本和归一化 offset 求得的物理 anchor',
    ]) {
      expect(markup).toContain(translation);
    }

    expect(markup).not.toContain('Stable authored tick identity.');
  });

  it('使用英语 Legend 参考的源 schema 描述', async () => {
    await i18n.changeLanguage('en');
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ZodSchema name="LegendSchema" expandNested />
        <ZodSchema name="LegendArtifactSchema" expandNested />
      </MemoryRouter>,
    );

    expect(markup).toContain('Canonical JSON-safe Standard Legend composite.');
    expect(markup).toContain('Stable authored tick identity.');
    expect(markup).not.toContain('稳定的刻度编写标识');
  });

  it('呈现默认和可为空的 Legend 字段及其底层公共类型', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ZodSchema name="LegendSchema" expandNested />
        <ZodSchema name="LegendArtifactSchema" expandNested />
      </MemoryRouter>,
    );

    expect(markup).not.toMatch(/unhandled: (default|nullable)/);
    expect(markup).toContain('number');
    expect(markup).toContain('null');
  });
});

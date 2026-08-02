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

describe('ZodSchema deep expansion', () => {
  it('round-trips typed paths without collisions for reserved keys and discriminator types', () => {
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

  it('renders arrays, tuples and union branches with canonical description overrides', () => {
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
    for (const translation of ['标签。', '数值。', '标记。', '左值。']) expect(markup).toContain(translation);
  });

  it('warns for malformed, mistyped and missing deep description paths', () => {
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

  it('expands a top-level discriminated union instead of collapsing it to a compact alias', () => {
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

  it('covers every visible Legend input and artifact path with registry-owned Chinese descriptions', () => {
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

  it('uses source schema descriptions for the English Legend reference', async () => {
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

  it('renders defaulted and nullable Legend fields with their underlying public types', () => {
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

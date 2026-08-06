import type { FC } from 'react';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { ObjectField, SchemaPathSegment, TableRow, TypeRepr } from './types';

import { RenderTable } from './RenderTable';
import { RenderType } from './RenderType';
import { parseSchemaPath, serializeSchemaPath } from './schema-path';
import { SCHEMA_REGISTRY } from './schema-registry';
import { walk } from './walker';

/** Zod schema 文档表格的渲染参数 */
export type ZodSchemaProps = {
  /** 注册表里的 schema 名（变量名，带 Schema 后缀） */
  name: string;
  /** 覆盖 schema 顶层描述；中文 mdx 用于翻译源码里的英文 .describe() */
  description?: string;
  /**
   * 按字段名（或点路径，如 `label.text`）覆盖描述。
   * @description 中文 mdx 必填，英文 mdx 留空走 .describe()。漏写降级到英文并 warn
   */
  descriptions?: Readonly<Partial<Record<string, string>>>;
  /** 递归展开 array、tuple 与 union 内的匿名字段，并使用 canonical typed path */
  expandNested?: boolean;
};

/** 递归把嵌套 object 字段平铺为 TableRow 列表（父行后紧跟匿名子行） */
function flattenFields(fields: Array<ObjectField>): Array<TableRow> {
  const rows: Array<TableRow> = [];
  for (const f of fields) {
    rows.push({ ...f, isChild: false });
    if (f.type.kind === 'object') {
      for (const child of f.type.fields) {
        rows.push({ ...child, name: '', isChild: true, originalName: child.name });
      }
    }
  }
  return rows;
}

/** 递归应用 descriptions 覆盖；支持点路径如 'label.text' */
function applyDescriptions(
  fields: Array<ObjectField>,
  descs: Readonly<Partial<Record<string, string>>>,
  prefix = '',
): Array<ObjectField> {
  return fields.map(f => {
    const key = prefix === '' ? f.name : `${prefix}.${f.name}`;
    const override = Object.hasOwn(descs, key) ? descs[key] : undefined;
    let type = f.type;
    if (type.kind === 'object') {
      type = { ...type, fields: applyDescriptions(type.fields, descs, key) };
    }
    return {
      ...f,
      description: override ?? f.description,
      type,
    };
  });
}

/** 收集所有合法的字段路径（含嵌套），用于 descriptions key 拼写检查 */
function collectFieldPaths(fields: Array<ObjectField>, prefix = ''): Array<string> {
  const out: Array<string> = [];
  for (const f of fields) {
    const key = prefix === '' ? f.name : `${prefix}.${f.name}`;
    out.push(key);
    if (f.type.kind === 'object') {
      out.push(...collectFieldPaths(f.type.fields, key));
    }
  }
  return out;
}

type PathVariants = Array<Array<SchemaPathSegment>>;

const appendPath = (paths: PathVariants, segment: SchemaPathSegment): PathVariants =>
  paths.map(path => [...path, segment]);

const branchLabel = (type: TypeRepr & { kind: 'union' }, index: number): string => {
  const branch = type.branches?.[index];
  if (branch === undefined || branch.values.length === 0) return `union[${index}]`;
  const values = branch.values.map(value => (typeof value === 'string' ? `"${value}"` : String(value))).join(' | ');
  return `case ${branch.discriminator}: ${values}`;
};

const expandTypeRows = (type: TypeRepr, paths: PathVariants, depth: number): Array<TableRow> => {
  if (type.kind === 'default') {
    return expandTypeRows(type.inner, paths, depth);
  }
  if (type.kind === 'object') return flattenNestedFields(type.fields, paths, depth);
  if (type.kind === 'array') return expandTypeRows(type.element, appendPath(paths, { kind: 'array' }), depth);
  if (type.kind === 'tuple') {
    return type.elements.flatMap((element, index) => {
      const variants = appendPath(paths, { kind: 'tuple', index });
      const label = `tuple[${index}]`;
      return [syntheticRow(label, element, variants, depth), ...expandTypeRows(element, variants, depth + 1)];
    });
  }
  if (type.kind === 'union') {
    return type.members.flatMap((member, index) => {
      const branch = type.branches?.[index];
      const segments: Array<SchemaPathSegment> =
        branch !== undefined && branch.values.length > 0
          ? branch.values.map(value => ({ kind: 'case', discriminator: branch.discriminator, value }))
          : [{ kind: 'union', index }];
      const variants = paths.flatMap(path => segments.map(segment => [...path, segment]));
      const label = branchLabel(type, index);
      return [syntheticRow(label, member, variants, depth), ...expandTypeRows(member, variants, depth + 1)];
    });
  }
  return [];
};

const syntheticRow = (label: string, type: TypeRepr, paths: PathVariants, depth: number): TableRow => ({
  name: label,
  type,
  optional: false,
  constraints: [],
  branchLabel: label,
  isSynthetic: true,
  path: serializeSchemaPath(paths[0] ?? []),
  aliasPaths: paths.slice(1).map(serializeSchemaPath),
  depth,
});

/** 使用 walker 的同一棵树递归生成可见行与 canonical path */
function flattenNestedFields(fields: Array<ObjectField>, parents: PathVariants = [[]], depth = 0): Array<TableRow> {
  return fields.flatMap(field => {
    const paths = appendPath(parents, { kind: 'field', key: field.name });
    const row: TableRow = {
      ...field,
      path: serializeSchemaPath(paths[0] ?? []),
      aliasPaths: paths.slice(1).map(serializeSchemaPath),
      depth,
    };
    return [row, ...expandTypeRows(field.type, paths, depth + 1)];
  });
}

const applyCanonicalDescriptions = (
  rows: Array<TableRow>,
  descriptions: Readonly<Partial<Record<string, string>>>,
): Array<TableRow> =>
  rows.map(row => {
    if (row.isSynthetic === true) return row;
    const candidates = [row.path, ...(row.aliasPaths ?? [])].filter((path): path is string => path !== undefined);
    const override = candidates.map(path => descriptions[path]).find(value => value !== undefined);
    return { ...row, description: override ?? row.description };
  });

export const ZodSchema: FC<ZodSchemaProps> = props => {
  const { name, description, descriptions, expandNested = false } = props;
  const { i18n, t } = useTranslation();
  const entry = (SCHEMA_REGISTRY as Record<string, (typeof SCHEMA_REGISTRY)[string] | undefined>)[name];

  const repr = useMemo(() => {
    if (entry == null) return null;
    return walk(entry.schema);
  }, [entry]);

  if (entry == null) {
    console.warn(`[ZodSchema] schema "${name}" not in SCHEMA_REGISTRY`);
    return (
      <div className="my-4 rounded border border-destructive p-3 text-sm">
        Unknown schema: <code className="font-mono">{name}</code>
      </div>
    );
  }
  if (repr == null) return null;

  const language = i18n.resolvedLanguage ?? i18n.language;
  const locale = language.startsWith('zh') ? 'zh' : language.startsWith('en') ? 'en' : undefined;
  const localization = locale === undefined ? undefined : entry.localizations?.[locale];
  const effectiveDescription = description ?? localization?.description;
  const effectiveDescriptions = descriptions ?? localization?.descriptions;

  let rows: Array<TableRow> | null = null;
  if (repr.kind === 'object') {
    if (expandNested) {
      const nestedRows = flattenNestedFields(repr.fields);
      rows = effectiveDescriptions == null ? nestedRows : applyCanonicalDescriptions(nestedRows, effectiveDescriptions);
    } else {
      const overridden =
        effectiveDescriptions != null ? applyDescriptions(repr.fields, effectiveDescriptions) : repr.fields;
      rows = flattenFields(overridden);
    }
  } else if (expandNested) {
    const nestedRows = expandTypeRows(repr.type, [[]], 0);
    rows = effectiveDescriptions == null ? nestedRows : applyCanonicalDescriptions(nestedRows, effectiveDescriptions);
  }

  if (effectiveDescriptions != null && rows != null) {
    const validPaths = new Set(
      expandNested
        ? rows.flatMap(row =>
            [row.path, ...(row.aliasPaths ?? [])].filter((path): path is string => path !== undefined),
          )
        : repr.kind === 'object'
          ? collectFieldPaths(repr.fields)
          : [],
    );
    for (const k of Object.keys(effectiveDescriptions)) {
      if (expandNested) {
        try {
          parseSchemaPath(k);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`[ZodSchema] "${name}" has invalid description path "${k}": ${message}`);
          continue;
        }
      }
      if (!validPaths.has(k)) {
        console.warn(`[ZodSchema] "${name}" has no field path "${k}" — typo in descriptions?`);
      }
    }
    for (const r of rows) {
      if (r.isSynthetic === true) continue;
      const paths = [r.path, ...(r.aliasPaths ?? [])].filter((path): path is string => path !== undefined);
      const hasOverride = paths.some(path => effectiveDescriptions[path] != null);
      if ((expandNested && !hasOverride) || r.description == null || r.description === '') {
        console.warn(`[ZodSchema] "${name}" field "${r.path ?? r.name}" has no override`);
      }
    }
  }

  return (
    <div className="my-6">
      {(effectiveDescription != null || repr.description != null) && (
        <p className="mb-3 text-sm text-muted-foreground">{effectiveDescription ?? repr.description}</p>
      )}
      {rows != null ? (
        <RenderTable rows={rows} />
      ) : (
        repr.kind === 'alias' && (
          <div className="my-2">
            <span className="text-sm text-muted-foreground">{t('zodSchema.typePrefix')}</span>
            <RenderType repr={repr.type} />
          </div>
        )
      )}
    </div>
  );
};

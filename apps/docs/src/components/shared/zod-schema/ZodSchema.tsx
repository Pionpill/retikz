import { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { SCHEMA_REGISTRY } from '@/lib/schema-registry';

import { RenderTable } from './RenderTable';
import { RenderType } from './RenderType';
import type { ObjectField, TableRow } from './types';
import { walk } from './walker';

type Props = {
  /** 注册表里的 schema 名（变量名，带 Schema 后缀） */
  name: string;
  /** 覆盖 schema 顶层描述；中文 mdx 用于翻译源码里的英文 .describe() */
  description?: string;
  /**
   * 按字段名（或点路径，如 `label.text`）覆盖描述。
   * @description 中文 mdx 必填，英文 mdx 留空走 .describe()。漏写降级到英文并 warn
   */
  descriptions?: Record<string, string>;
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
  descs: Record<string, string>,
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

export const ZodSchema: FC<Props> = props => {
  const { name, description, descriptions } = props;
  const { t } = useTranslation();
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

  let rows: Array<TableRow> | null = null;
  if (repr.kind === 'object') {
    const overridden = descriptions != null
      ? applyDescriptions(repr.fields, descriptions)
      : repr.fields;
    rows = flattenFields(overridden);

    if (descriptions != null) {
      const validPaths = new Set(collectFieldPaths(repr.fields));
      for (const k of Object.keys(descriptions)) {
        if (!validPaths.has(k)) {
          console.warn(`[ZodSchema] "${name}" has no field path "${k}" — typo in descriptions?`);
        }
      }
      for (const r of rows) {
        if (r.description == null || r.description === '') {
          console.warn(`[ZodSchema] "${name}" field has no .describe() and no override`);
        }
      }
    }
  }

  return (
    <div className="my-6">
      {(description != null || repr.description != null) && (
        <p className="mb-3 text-sm text-muted-foreground">{description ?? repr.description}</p>
      )}
      {repr.kind === 'object' && rows != null ? (
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

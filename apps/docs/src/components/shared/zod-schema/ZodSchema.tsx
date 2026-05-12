import { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SCHEMA_REGISTRY } from '@/lib/schema-registry';
import { RenderTable } from './render-table';
import { RenderType } from './render-type';
import { walk } from './walker';

type Props = {
  /** 注册表里的 schema 名（变量名，带 Schema 后缀） */
  name: string;
  /**
   * 按字段名覆盖描述；中文 mdx 必填，英文 mdx 留空走 .describe()
   * 漏写的字段降级到英文 .describe() 并 warn
   */
  descriptions?: Record<string, string>;
};

export const ZodSchema: FC<Props> = ({ name, descriptions }) => {
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

  // 应用 descriptions 覆盖（仅 object kind 有意义）
  let appliedRepr = repr;
  if (descriptions != null && repr.kind === 'object') {
    appliedRepr = {
      ...repr,
      fields: repr.fields.map(f => {
        if (!Object.hasOwn(descriptions, f.name)) {
          if (!f.description) {
            console.warn(`[ZodSchema] "${name}.${f.name}" has no .describe() and no override`);
          }
          return f;
        }
        return { ...f, description: descriptions[f.name] };
      }),
    };
    // 警告 descriptions 写了但 schema 没有该字段
    const fieldNames = new Set(repr.fields.map(f => f.name));
    for (const k of Object.keys(descriptions)) {
      if (!fieldNames.has(k)) {
        console.warn(`[ZodSchema] "${name}" has no field "${k}" — typo in descriptions?`);
      }
    }
  }

  return (
    <div className="my-6">
      {appliedRepr.description != null && (
        <p className="mb-3 text-sm text-muted-foreground">{appliedRepr.description}</p>
      )}
      {appliedRepr.kind === 'object' ? (
        <RenderTable fields={appliedRepr.fields} />
      ) : (
        <div className="my-2">
          <span className="text-sm text-muted-foreground">{t('zodSchema.typePrefix')}</span>
          <RenderType repr={appliedRepr.type} />
        </div>
      )}
    </div>
  );
};

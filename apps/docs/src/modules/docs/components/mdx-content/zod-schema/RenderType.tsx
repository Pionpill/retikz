import type { FC } from 'react';

import { Link } from 'react-router';

import { cn } from '@/lib';

import type { TypeRepr } from './types';

const code = 'rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]';

export type RenderTypeProps = {
  repr: TypeRepr;
  className?: string;
  /** 嵌套在复合类型中时复用外层代码样式 */
  plain?: boolean;
};

/** TypeRepr → JSX；'ref' kind 渲染 react-router Link，其它就地渲染类型签名 */
export const RenderType: FC<RenderTypeProps> = props => {
  const { repr, className, plain = false } = props;
  const codeClassName = plain ? undefined : code;

  switch (repr.kind) {
    case 'primitive':
      return <span className={cn(codeClassName, className)}>{repr.name}</span>;

    case 'literal':
      return (
        <span className={cn(codeClassName, className)}>
          {typeof repr.value === 'string' ? `"${repr.value}"` : String(repr.value)}
        </span>
      );

    case 'enum':
      return (
        <span className={cn(codeClassName, className)}>
          {repr.values.map(v => (typeof v === 'string' ? `'${v}'` : String(v))).join(' | ')}
        </span>
      );

    case 'array':
      return (
        <span className={cn('inline-flex items-baseline gap-1', className)}>
          <RenderType repr={repr.element} plain={plain} />
          <span className={codeClassName}>[]</span>
          {repr.constraints.length > 0 && (
            <span className="text-xs text-muted-foreground">({repr.constraints.join(', ')})</span>
          )}
        </span>
      );

    case 'tuple':
      return (
        <span className={cn(code, className)}>
          [
          {repr.elements.map((e, i) => (
            <span key={i}>
              {i > 0 && ', '}
              <RenderType repr={e} plain />
            </span>
          ))}
          ]
        </span>
      );

    case 'default':
      return <RenderType repr={repr.inner} className={className} plain={plain} />;

    case 'nullable':
      return (
        <span className={cn('inline-flex items-baseline gap-1', className)}>
          <RenderType repr={repr.inner} plain={plain} />
          <span className="text-muted-foreground">|</span>
          <span className={codeClassName}>null</span>
        </span>
      );

    case 'union':
      return (
        <span className={cn('inline-flex flex-wrap items-baseline gap-1', className)}>
          {repr.members.map((m, i) => (
            <span key={i} className="inline-flex items-baseline gap-1">
              {i > 0 && <span className="text-muted-foreground">|</span>}
              <RenderType repr={m} plain={plain} />
            </span>
          ))}
        </span>
      );

    case 'ref':
      return (
        <Link to={repr.url} className={cn(codeClassName, 'underline underline-offset-4', className)}>
          {repr.name}
        </Link>
      );

    case 'object':
      return (
        <span className={cn('inline-flex flex-wrap items-baseline gap-x-1', codeClassName, className)}>
          <span>{'{'}</span>
          {repr.fields.map((field, index) => (
            <span key={field.name} className="inline-flex items-baseline gap-1">
              {index > 0 && <span>;</span>}
              <span>
                {field.name}
                {field.optional ? '?' : ''}:
              </span>
              <RenderType repr={field.type} plain />
              {field.constraints.length > 0 && (
                <span className="text-xs text-muted-foreground">({field.constraints.join(', ')})</span>
              )}
            </span>
          ))}
          {repr.additionalProperties && (
            <span className="inline-flex items-baseline gap-1">
              {repr.fields.length > 0 && <span>;</span>}
              <span>[key: string]: unknown</span>
            </span>
          )}
          <span>{'}'}</span>
        </span>
      );

    case 'unknown':
      return (
        <span className={cn(codeClassName, 'text-destructive', className)} title={repr.note}>
          unknown
        </span>
      );
  }
};

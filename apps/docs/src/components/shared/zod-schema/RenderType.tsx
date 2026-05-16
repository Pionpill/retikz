import type { FC } from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import type { TypeRepr } from './types';

const code = 'rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]';

/** TypeRepr → JSX；'ref' kind 渲染 react-router Link，其它就地渲染类型签名 */
export const RenderType: FC<{ repr: TypeRepr; className?: string }> = ({ repr, className }) => {
  switch (repr.kind) {
    case 'primitive':
      return <span className={cn(code, className)}>{repr.name}</span>;

    case 'literal':
      return (
        <span className={cn(code, className)}>
          {typeof repr.value === 'string' ? `"${repr.value}"` : String(repr.value)}
        </span>
      );

    case 'enum':
      return (
        <span className={cn(code, className)}>
          {repr.values.map(v => (typeof v === 'string' ? `'${v}'` : String(v))).join(' | ')}
        </span>
      );

    case 'array':
      return (
        <span className={cn('inline-flex items-baseline gap-1', className)}>
          <RenderType repr={repr.element} />
          <span className={code}>[]</span>
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
              <RenderType repr={e} />
            </span>
          ))}
          ]
        </span>
      );

    case 'union':
      return (
        <span className={cn('inline-flex flex-wrap items-baseline gap-1', className)}>
          {repr.members.map((m, i) => (
            <span key={i} className="inline-flex items-baseline gap-1">
              {i > 0 && <span className="text-muted-foreground">|</span>}
              <RenderType repr={m} />
            </span>
          ))}
        </span>
      );

    case 'ref':
      return (
        <Link to={repr.url} className={cn(code, 'underline underline-offset-4', className)}>
          {repr.name}
        </Link>
      );

    case 'object':
      return (
        <span className={cn(code, className)}>
          {`{ ${repr.fields.map(f => `${f.name}${f.optional ? '?' : ''}`).join(', ')} }`}
        </span>
      );

    case 'unknown':
      return (
        <span className={cn(code, 'text-destructive', className)} title={repr.note}>
          unknown
        </span>
      );
  }
};

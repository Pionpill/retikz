import type { FC } from 'react';

import { cn } from '@/lib';

import { ApiValues, API_VALUE_REGISTRY } from '../api-values';
import type { TypeRepr } from './types';

const code = 'rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]';

/** 展平等价的嵌套联合，仅用于类型声明排版 */
const unionMembers = (repr: TypeRepr): Array<TypeRepr> =>
  repr.kind === 'union' ? repr.members.flatMap(unionMembers) : [repr];

export type RenderTypeProps = {
  repr: TypeRepr;
  className?: string;
  /** 嵌套在复合类型中时复用外层代码样式 */
  plain?: boolean;
};

/** TypeRepr → 类型声明；具名类型保留原名，公开枚举提供值提示 */
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

    case 'enum': {
      const matches = Object.entries(API_VALUE_REGISTRY).filter(
        ([, entry]) =>
          entry.values.length === repr.values.length &&
          entry.values.every((value, index) => value === repr.values[index]),
      );
      if (matches.length === 1) return <ApiValues name={matches[0][0]} />;
      return (
        <span className={cn(codeClassName, className)}>
          {repr.values.map((v, i) => (
            <span key={i} className="inline-block whitespace-nowrap">
              {i > 0 && ' | '}
              {typeof v === 'string' ? `'${v}'` : String(v)}
            </span>
          ))}
        </span>
      );
    }

    case 'array':
      return (
        <span className={cn(codeClassName, 'inline-block max-w-full', className)}>
          {(repr.element.kind === 'union' || repr.element.kind === 'enum') && '('}
          <RenderType repr={repr.element} plain />
          {(repr.element.kind === 'union' || repr.element.kind === 'enum') && ')'}
          []
          {repr.constraints.length > 0 && (
            <span className="text-xs text-muted-foreground">({repr.constraints.join(', ')})</span>
          )}
        </span>
      );

    case 'tuple':
      return (
        <span className={cn(codeClassName, className)}>
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

    case 'record':
      return (
        <span className={cn('inline-flex items-baseline gap-1', codeClassName, className)}>
          <span>Record&lt;</span>
          <RenderType repr={repr.key} plain />
          <span>,</span>
          <RenderType repr={repr.value} plain />
          <span>&gt;</span>
        </span>
      );

    case 'union':
      return (
        <span className={cn('inline-block max-w-full align-top', className)}>
          {unionMembers(repr).map((m, i) => (
            <span key={i} className="grid grid-cols-[1ch_minmax(0,1fr)] items-start gap-x-1 [&+span]:mt-1">
              <span className="text-muted-foreground">{'| '}</span>
              <span className="min-w-0">
                <RenderType repr={m} plain={plain} />
              </span>
            </span>
          ))}
        </span>
      );

    case 'intersection':
      return (
        <span className={cn('inline-block max-w-full align-top', className)}>
          {repr.members.map((member, index) => (
            <span key={index} className="grid grid-cols-[1ch_minmax(0,1fr)] items-start gap-x-1 [&+span]:mt-1">
              <span className="text-muted-foreground">{index === 0 ? '' : '& '}</span>
              <span className="min-w-0">
                <RenderType repr={member} plain={plain} />
              </span>
            </span>
          ))}
        </span>
      );

    case 'ref':
      return <span className={cn(codeClassName, className)}>{repr.name}</span>;

    case 'object':
      return (
        <span className={cn('inline-block max-w-full align-top leading-relaxed indent-0', codeClassName, className)}>
          <span className="block">{'{'}</span>
          {repr.fields.map(field => (
            <span key={field.name} className="block pl-4 [overflow-wrap:anywhere]">
              <span>
                {field.name}
                {field.optional ? '?' : ''}:{' '}
              </span>
              <RenderType repr={field.type} plain />
              {field.constraints.length > 0 && (
                <span className="text-xs text-muted-foreground">({field.constraints.join(', ')})</span>
              )}
              ;
            </span>
          ))}
          {repr.additionalProperties && (
            <span className="block pl-4">
              <span>[key: string]: unknown;</span>
            </span>
          )}
          <span className="block">{'}'}</span>
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

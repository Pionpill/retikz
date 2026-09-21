import type { ComponentPropsWithoutRef, FC } from 'react';

import { cn } from '@/lib';

import { InlineMdx } from '../InlineMdx';
import type { ComponentPropItem, ComponentPropKind } from './types';

const kindLabel: Record<ComponentPropKind, string> = {
  property: 'Property',
  function: 'Function',
  constant: 'Constant',
  type: 'Type',
};

/** 组件成员说明的渲染属性 */
export type ComponentPropsProps = {
  /** 按当前章节顺序展示的公开成员 */
  items: ReadonlyArray<ComponentPropItem>;
};

/** 以简洁的成员卡片展示当前章节涉及的组件属性 */
export const ComponentProps: FC<ComponentPropsProps> = props => {
  const { items } = props;

  return (
    <section data-component-props className="my-4 divide-y">
      {items.map(item => (
        <article key={item.name} className="py-5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <code className="font-mono text-sm font-medium">{item.name}</code>
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
              {kindLabel[item.kind]}
            </span>
            {(item.defaultValue != null || item.value != null || item.required) && (
              <dl data-component-prop-values className="ml-auto flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs">
                {item.defaultValue != null && (
                  <div className="flex items-baseline gap-1.5">
                    <dt className="text-muted-foreground">Default</dt>
                    <dd className="text-muted-foreground">{item.defaultValue}</dd>
                  </div>
                )}
                {item.value != null && (
                  <div className="flex items-baseline gap-1.5">
                    <dt className="text-muted-foreground">Value</dt>
                    <dd>{item.value}</dd>
                  </div>
                )}
                {item.defaultValue == null && item.value == null && item.required && (
                  <div data-component-prop-required>
                    <dt className="sr-only">Required</dt>
                    <dd className="font-medium tracking-wide text-muted-foreground uppercase">REQUIRED</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
          <code className="mt-2 block w-fit max-w-full overflow-x-auto rounded-md bg-muted px-2 py-1 font-mono text-xs whitespace-nowrap">
            {item.type}
          </code>
          <InlineMdx
            source={item.description}
            className="mt-3! text-sm"
            components={{
              ul: ({ className, ...rest }: ComponentPropsWithoutRef<'ul'>) => (
                <ul className={cn('text-sm', className)} {...rest} />
              ),
              ol: ({ className, ...rest }: ComponentPropsWithoutRef<'ol'>) => (
                <ol className={cn('text-sm', className)} {...rest} />
              ),
            }}
          />
        </article>
      ))}
    </section>
  );
};

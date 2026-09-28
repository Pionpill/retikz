import type { TypeRepr } from './types';

/** Schema 类型默认展开的字符上限 */
export const MAX_SCHEMA_TYPE_CHARACTERS = 300;

/** 用紧凑签名衡量类型展开规模，包含匿名字段与嵌套分支 */
export const schemaTypeText = (repr: TypeRepr): string => {
  switch (repr.kind) {
    case 'primitive':
    case 'ref':
      return repr.name;
    case 'literal':
      return JSON.stringify(repr.value);
    case 'enum':
      return repr.values.map(value => JSON.stringify(value)).join(' | ');
    case 'array':
      return `(${schemaTypeText(repr.element)})[]${repr.constraints.length ? ` (${repr.constraints.join(', ')})` : ''}`;
    case 'tuple':
      return `[${repr.elements.map(schemaTypeText).join(', ')}]`;
    case 'default':
      return schemaTypeText(repr.inner);
    case 'nullable':
      return `${schemaTypeText(repr.inner)} | null`;
    case 'record':
      return `Record<${schemaTypeText(repr.key)}, ${schemaTypeText(repr.value)}>`;
    case 'union':
    case 'intersection':
      return repr.members.map(schemaTypeText).join(repr.kind === 'union' ? ' | ' : ' & ');
    case 'object':
      return `{ ${repr.fields.map(field => `${field.name}${field.optional ? '?' : ''}: ${schemaTypeText(field.type)}${field.constraints.length ? ` (${field.constraints.join(', ')})` : ''};`).join(' ')}${repr.additionalProperties ? ' [key: string]: unknown;' : ''} }`;
    case 'unknown':
      return 'unknown';
  }
};

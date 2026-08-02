import type { SchemaPathLiteral, SchemaPathSegment } from './types';

const escapePointerSegment = (value: string): string => value.replaceAll('~', '~0').replaceAll('/', '~1');

const unescapePointerSegment = (value: string): string => {
  if (/~(?:[^01]|$)/.test(value)) throw new Error(`Invalid RFC 6901 escape in segment "${value}".`);
  return value.replaceAll('~1', '/').replaceAll('~0', '~');
};

const encodePayload = (value: SchemaPathLiteral): string => escapePointerSegment(JSON.stringify(value));

const decodePayload = (value: string): SchemaPathLiteral => {
  const decoded = JSON.parse(unescapePointerSegment(value)) as unknown;
  if (decoded === null || ['string', 'number', 'boolean'].includes(typeof decoded)) {
    return decoded as SchemaPathLiteral;
  }
  throw new Error(`Schema path payload must be a JSON scalar: "${value}".`);
};

const literalType = (value: SchemaPathLiteral): 'string' | 'number' | 'boolean' | 'null' => {
  if (value === null) return 'null';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  return 'boolean';
};

/** 把 typed schema path 序列化为 RFC 6901 风格 canonical path */
export const serializeSchemaPath = (segments: ReadonlyArray<SchemaPathSegment>): string => {
  const tokens = segments.flatMap(segment => {
    switch (segment.kind) {
      case 'field':
        return ['field', encodePayload(segment.key)];
      case 'array':
        return ['array'];
      case 'tuple':
        return ['tuple', encodePayload(segment.index)];
      case 'case':
        return ['case', encodePayload(segment.discriminator), literalType(segment.value), encodePayload(segment.value)];
      case 'union':
        return ['union', encodePayload(segment.index)];
    }
  });
  return tokens.length === 0 ? '' : `/${tokens.join('/')}`;
};

/** 解析 canonical schema path，并校验 marker、payload 与 selector 类型 */
export const parseSchemaPath = (path: string): Array<SchemaPathSegment> => {
  if (path === '') return [];
  if (!path.startsWith('/')) throw new Error('Schema path must start with "/".');
  const tokens = path.slice(1).split('/');
  const segments: Array<SchemaPathSegment> = [];
  for (let index = 0; index < tokens.length; ) {
    const marker = tokens[index++];
    if (marker === 'array') {
      segments.push({ kind: 'array' });
      continue;
    }
    if (marker === 'field') {
      const payload = tokens.at(index++);
      if (payload === undefined) throw new Error('Field path segment is missing its key.');
      const key = decodePayload(payload);
      if (typeof key !== 'string') throw new Error('Field path key must be a JSON string.');
      segments.push({ kind: 'field', key });
      continue;
    }
    if (marker === 'tuple' || marker === 'union') {
      const payload = tokens.at(index++);
      if (payload === undefined) throw new Error(`${marker} path segment is missing its index.`);
      const value = decodePayload(payload);
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        throw new Error(`${marker} path index must be a non-negative safe integer.`);
      }
      segments.push(marker === 'tuple' ? { kind: 'tuple', index: value } : { kind: 'union', index: value });
      continue;
    }
    if (marker === 'case') {
      const discriminatorPayload = tokens.at(index++);
      const type = tokens.at(index++);
      const valuePayload = tokens.at(index++);
      if (discriminatorPayload === undefined || type === undefined || valuePayload === undefined) {
        throw new Error('Case path segment is incomplete.');
      }
      const discriminator = decodePayload(discriminatorPayload);
      const value = decodePayload(valuePayload);
      if (typeof discriminator !== 'string') throw new Error('Case discriminator must be a JSON string.');
      if (type !== literalType(value)) throw new Error(`Case selector type "${type}" does not match its payload.`);
      segments.push({ kind: 'case', discriminator, value });
      continue;
    }
    throw new Error(`Unknown schema path marker "${marker}".`);
  }
  return segments;
};

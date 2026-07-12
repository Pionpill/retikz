type JsonScalar = string | number | boolean | null;
type JsonValue = JsonScalar | Array<JsonValue> | { [key: string]: JsonValue };

const INLINE_MAX = 60;
const INDENT = '  ';

const isScalar = (value: JsonValue): value is JsonScalar =>
  value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const formatJsonValue = (value: JsonValue, depth: number): string => {
  const compact = JSON.stringify(value);
  if (isScalar(value)) return compact;
  if (Array.isArray(value) && value.every(isScalar)) {
    const inline = `[${value.map(item => JSON.stringify(item)).join(', ')}]`;
    if (inline.length <= INLINE_MAX) return inline;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const indentation = INDENT.repeat(depth + 1);
    const closingIndentation = INDENT.repeat(depth);
    return `[\n${value.map(item => `${indentation}${formatJsonValue(item, depth + 1)}`).join(',\n')}\n${closingIndentation}]`;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';
  const indentation = INDENT.repeat(depth + 1);
  const closingIndentation = INDENT.repeat(depth);
  return `{\n${entries
    .map(([key, item]) => `${indentation}${JSON.stringify(key)}: ${formatJsonValue(item, depth + 1)}`)
    .join(',\n')}\n${closingIndentation}}`;
};

/** 格式化 IR JSON，并将较短的纯标量数组保留在单行。 */
export const formatIR = (ir: unknown): string => {
  const serialized = JSON.stringify(ir);
  return formatJsonValue(JSON.parse(serialized) as JsonValue, 0);
};

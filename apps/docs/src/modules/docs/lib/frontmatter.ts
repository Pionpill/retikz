/** 文档索引与静态生成共同消费的最小 frontmatter。 */
export type DocFrontmatter = {
  title: string;
  description: string;
};

/** frontmatter 与正文的解析结果。 */
export type ParsedDocSource = {
  frontmatter: DocFrontmatter;
  body: string;
};

const unquoteScalar = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  return trimmed;
};

/** 解析可带 UTF-8 BOM 的 MDX frontmatter，并去除标量引号。 */
export const parseDocSource = (source: string): ParsedDocSource => {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  const block = match?.[1] ?? '';
  const read = (key: keyof DocFrontmatter) => {
    const value = new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm').exec(block)?.[1];
    return value === undefined ? '' : unquoteScalar(value);
  };
  return {
    frontmatter: { title: read('title'), description: read('description') },
    body: match === null ? source : source.slice(match[0].length),
  };
};

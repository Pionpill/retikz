import { SceneSchema } from '@retikz/core';
import type { ZodError } from 'zod';

import { parseRetikzJsx } from '@/lib/jsx-to-ir';

export type RetikzBlockFormat = 'ir' | 'tsx';

/** 一段 retikz fenced 块 + 静态校验结果 */
export type RetikzBlockValidation = {
  format: RetikzBlockFormat;
  /** fenced 块体（不含三反引号 + 语言标记） */
  source: string;
  /** null = 校验通过；string = 错误细节 */
  error: string | null;
};

/** 前 3 个 zod issue 拼成单行可读串，路径用 `a.b[0].c` 风格 */
export const formatZodError = (err: ZodError): string => {
  const issues = err.issues.slice(0, 3).map(issue => {
    const path = issue.path
      .map((segment, idx) => (typeof segment === 'number' ? `[${segment}]` : idx === 0 ? String(segment) : `.${String(segment)}`))
      .join('');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  const extra = err.issues.length > 3 ? ` (+${err.issues.length - 3} more)` : '';
  return issues.join('; ') + extra;
};

/** 同 RetikzPreview 的 resolveIr，但只返回 error 字段（true=非法）；分离出来 store 可独立调用 */
const validateIrSource = (source: string): string | null => {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch (err) {
    return `JSON parse failed — ${err instanceof Error ? err.message : String(err)}`;
  }
  const parsed = SceneSchema.safeParse(raw);
  if (!parsed.success) return `schema mismatch — ${formatZodError(parsed.error)}`;
  return null;
};

const validateTsxSource = (source: string): string | null => {
  const parsed = parseRetikzJsx(source);
  if (!parsed.ok) return parsed.error;
  return null;
};

/** retikz fenced 块的语言标记 → format 映射；非 retikz-* 不识别 */
const RETIKZ_LANG_FORMAT: Readonly<Record<string, RetikzBlockFormat | undefined>> = {
  'retikz-ir': 'ir',
  'retikz-tsx': 'tsx',
};

/**
 * 扫描一段 markdown 文本里所有闭合的 retikz fenced 块并校验
 * @description 用与 AiChatMessage.parseBlocks 同款的"扫到 ``` 找下一个 ``` 闭合"逻辑；未闭合的（流式中段）跳过；非 retikz-* lang 跳过
 */
export const extractRetikzBlocks = (content: string): Array<RetikzBlockValidation> => {
  const lines = content.split('\n');
  const out: Array<RetikzBlockValidation> = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.startsWith('```')) {
      i++;
      continue;
    }
    const lang = line.slice(3).trim();
    const start = i + 1;
    let j = start;
    while (j < lines.length && !lines[j].startsWith('```')) j++;
    const closed = j < lines.length;
    if (!closed) break;
    const format = RETIKZ_LANG_FORMAT[lang];
    if (format !== undefined) {
      const source = lines.slice(start, j).join('\n');
      const error = format === 'ir' ? validateIrSource(source) : validateTsxSource(source);
      out.push({ format, source, error });
    }
    i = j + 1;
  }
  return out;
};

/** 只返回有 error 的块 */
export const findInvalidRetikzBlocks = (content: string): Array<RetikzBlockValidation> =>
  extractRetikzBlocks(content).filter(b => b.error !== null);

/** 拼自动修复 prompt：把所有非法块的错误细节交给 AI，让它仅重写 IR 部分 */
export const buildRepairPrompt = (invalid: Array<RetikzBlockValidation>, lang: 'zh' | 'en'): string => {
  const sections = invalid.map((b, idx) => {
    const header =
      lang === 'en'
        ? `### Block ${idx + 1} (\`retikz-${b.format}\`) — invalid`
        : `### 块 ${idx + 1}（\`retikz-${b.format}\`）— 非法`;
    return `${header}\n\nError: ${b.error}\n\nSource:\n\`\`\`retikz-${b.format}\n${b.source}\n\`\`\``;
  });

  if (lang === 'en') {
    return `Your previous retikz block(s) failed automated validation. Please reread the Schema cheatsheet in the system prompt and re-emit ONLY the corrected fenced block(s) — no extra prose, no other content.

${sections.join('\n\n')}`;
  }
  return `你上面的 retikz 块没通过自动校验。请重新核对系统 prompt 里的 Schema 速查，然后**只重发修正后的 fenced 块**——不要加任何前言、解释、或其他内容。

${sections.join('\n\n')}`;
};

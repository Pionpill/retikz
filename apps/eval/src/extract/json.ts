/**
 * 从模型文本里抽出第一个完整 JSON 对象。
 * 容忍 ```json 围栏与前后解释文字；解析失败返回 null（计为该层失败）。
 */
export const extractJson = (text: string): unknown | null => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;

  const start = body.indexOf('{');
  if (start === -1) return null;

  // 从首个 { 起做括号配平，找到匹配的 }（跳过字符串内的括号）
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < body.length; i += 1) {
    const ch = body[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        const candidate = body.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

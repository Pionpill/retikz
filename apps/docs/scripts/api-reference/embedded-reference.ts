/** 将独立 API 参考投影为组件合页中的局部参考 */
export const embedApiReferenceMdx = (source: string): string => {
  let inCodeFence = false;

  return source
    .split('\n')
    .map(line => {
      if (/^```/.test(line)) {
        inCodeFence = !inCodeFence;
        return line;
      }

      if (inCodeFence) return line;

      const heading = line.match(/^(#{2,4}) (.+)$/);
      if (!heading) return line;

      const [, hashes, title] = heading;
      if (hashes.length === 2) return `**${title}**`;

      return `${'#'.repeat(hashes.length + 1)} ${title}`;
    })
    .join('\n');
};

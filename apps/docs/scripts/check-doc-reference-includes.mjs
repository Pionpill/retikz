import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import GithubSlugger from 'github-slugger';

/** 与站点 include 稳定名称一致的静态展开，验证最终可见标题和链接 */
const expandSource = (source, language, contentsRoot) =>
  source.replace(/\{\/\*\s*@include\s+([a-z0-9][a-z0-9/_-]*)\s*\*\/\}/gu, (_marker, name) => {
    const directory = name.slice(0, name.lastIndexOf('/'));
    const filename = name.slice(name.lastIndexOf('/') + 1);
    const file = path.join(contentsRoot, directory, '_includes', `${filename}.${language}.mdx`);
    return readFileSync(file, 'utf8');
  });

/** 查询最终渲染内容的 heading id，不把 JSX 标签属性算进标题 */
const anchorsOf = source => {
  const slugger = new GithubSlugger();
  return new Set(
    [...source.replace(/```[\s\S]*?```/gu, '').matchAll(/^(#{1,6})\s+(.+?)\s*#*\s*$/gmu)].map(match =>
      slugger.slug(
        match[2]
          .replace(/<[^>]+>/gu, '')
          .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
          .replace(/[`*_~]/gu, '')
          .trim(),
      ),
    ),
  );
};

/** 对原静态检查的 include 锚点盲区做真实内容复核，真实断链仍保留为错误 */
export const validateReferenceIncludes = (errors, files, contentsRoot) => {
  const filtered = errors.filter(error => {
    const match = error.match(/^(.*index\.(zh|en)\.mdx): anchor does not exist: (\/[^#]+)#(.+)$/u);
    if (!match) return true;
    const target = path.join(contentsRoot, match[3], `index.${match[2]}.mdx`);
    if (!existsSync(target)) return true;
    const content = expandSource(readFileSync(target, 'utf8'), match[2], contentsRoot);
    return !anchorsOf(content).has(decodeURIComponent(match[4]));
  });
  for (const file of files) {
    const language = file.endsWith('.zh.mdx') ? 'zh' : 'en';
    const raw = readFileSync(file, 'utf8');
    const content = expandSource(raw, language, contentsRoot);
    const links = new Set([
      ...[...content.matchAll(/\]\(([\/#][^)\s]+)\)/gu)].map(match => match[1]),
      ...[...content.matchAll(/url:\s*['"](\/[^'"]+)['"]/gu)].map(match => match[1]),
    ]);
    for (const link of links) {
      const [route, anchor] = link.split('#');
      if (!raw.includes('@include') && !route.includes('/reference')) continue;
      const target = route ? path.join(contentsRoot, route, `index.${language}.mdx`) : file;
      if (!existsSync(target)) {
        filtered.push(`${file}: included route does not exist: ${link}`);
        continue;
      }
      if (
        anchor &&
        !anchorsOf(expandSource(readFileSync(target, 'utf8'), language, contentsRoot)).has(decodeURIComponent(anchor))
      )
        filtered.push(`${file}: included anchor does not exist: ${link}`);
    }
  }
  return [...new Set(filtered)];
};

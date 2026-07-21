#!/usr/bin/env node

import { createRequire } from 'node:module';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const exists = async target => {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
};

const walk = async directory => {
  if (!(await exists(directory))) return [];

  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async entry => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(target) : [target];
    }),
  );

  return nested.flat();
};

const slash = value => value.split(path.sep).join('/');

const relativeLabel = (repoRoot, target) => slash(path.relative(repoRoot, target));

const physicalLineCount = content => {
  const lines = content.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();
  return lines.length;
};

const withoutFencedCode = content => content.replace(/```[\s\S]*?```/g, '');

const headingText = value =>
  value
    .replace(/<[^>]+>/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim();

let GithubSlugger;

const getGithubSlugger = async () => {
  if (GithubSlugger) return GithubSlugger;

  const requireFromDocs = createRequire(path.join(process.cwd(), 'apps/docs/package.json'));
  const modulePath = requireFromDocs.resolve('github-slugger');
  ({ default: GithubSlugger } = await import(pathToFileURL(modulePath).href));
  return GithubSlugger;
};

const collectHeadingData = async content => {
  const Slugger = await getGithubSlugger();
  const slugger = new Slugger();
  const headings = [];
  const source = withoutFencedCode(content);

  for (const match of source.matchAll(/^(#{1,6})\s+(.+?)\s*#*\s*$/gm)) {
    const text = headingText(match[2]);
    if (!text) continue;
    headings.push({ level: match[1].length, slug: slugger.slug(text), text });
  }

  return headings;
};

const collectAnchorIds = async content => {
  const headings = await collectHeadingData(content);
  const anchors = new Set(headings.map(({ slug }) => slug));
  const source = withoutFencedCode(content);

  for (const match of source.matchAll(/\bid\s*=\s*['"]([^'"]+)['"]/g)) {
    anchors.add(match[1]);
  }

  return anchors;
};

const collectInternalLinks = content => {
  const links = [];
  const source = withoutFencedCode(content);

  for (const match of source.matchAll(/\]\((\/[^)\s]+)(?:\s+['"][^'"]*['"])?\)/g)) {
    links.push(match[1]);
  }
  for (const match of source.matchAll(/\bhref\s*=\s*['"](\/[^'"]+)['"]/g)) {
    links.push(match[1]);
  }

  return [...new Set(links)];
};

const collectSourceLinks = content => {
  const sources = [];

  for (const block of content.matchAll(/<SourceLinks\b[\s\S]*?\/>/g)) {
    for (const object of block[0].matchAll(/\{[^{}]*\bpath\s*:\s*['"]([^'"]+)['"][^{}]*\}/g)) {
      const start = object[0].match(/\bstartLine\s*:\s*(\d+)/);
      const end = object[0].match(/\bendLine\s*:\s*(\d+)/);
      sources.push({
        path: object[1],
        startLine: start ? Number(start[1]) : undefined,
        endLine: end ? Number(end[1]) : undefined,
      });
    }
  }

  return sources;
};

const collectPreviewIds = content => {
  const ids = [];

  for (const block of content.matchAll(/<ComponentPreview\b[\s\S]*?\/>/g)) {
    const source = block[0];
    const direct = source.match(/\bfiles\s*=\s*['"]([^'"]+)['"]/);
    const arrayString = source.match(/\bfiles\s*=\s*\{\s*\[\s*['"]([^'"]+)['"]/);
    const arrayObject = source.match(/\bfiles\s*=\s*\{\s*\[\s*\{[\s\S]*?\bfile\s*:\s*['"]([^'"]+)['"]/);
    const id = direct?.[1] ?? arrayString?.[1] ?? arrayObject?.[1];
    if (id) ids.push(id);
  }

  return ids;
};

const languageOf = target => (target.endsWith('.zh.mdx') ? 'zh' : 'en');

const routeTarget = async ({ contentsRoot, language, registeredRoutes, route }) => {
  const [rawPath, rawHash] = route.split('#', 2);
  const decodedPath = decodeURIComponent(rawPath).replace(/^\/+|\/+$/g, '');
  if (!decodedPath) return undefined;

  const directory = path.join(contentsRoot, ...decodedPath.split('/'));
  const preferred = path.join(directory, `index.${language}.mdx`);
  const fallback = path.join(directory, 'index.zh.mdx');
  const target = (await exists(preferred)) ? preferred : (await exists(fallback)) ? fallback : undefined;
  const normalizedRoute = `/${decodedPath}`;

  return {
    anchor: rawHash ? decodeURIComponent(rawHash) : undefined,
    target,
    exists: target !== undefined || registeredRoutes.has(normalizedRoute),
  };
};

let TypeScript;

const getTypeScript = () => {
  if (TypeScript) return TypeScript;
  const requireFromRoot = createRequire(path.join(process.cwd(), 'package.json'));
  TypeScript = requireFromRoot('typescript');
  return TypeScript;
};

const property = (ts, object, name) =>
  object.properties.find(
    item =>
      ts.isPropertyAssignment(item) &&
      ((ts.isIdentifier(item.name) && item.name.text === name) ||
        (ts.isStringLiteral(item.name) && item.name.text === name)),
  );

const stringProperty = (ts, object, name) => {
  const item = property(ts, object, name);
  return item && ts.isStringLiteral(item.initializer) ? item.initializer.text : undefined;
};

const arrayProperty = (ts, object, name) => {
  const item = property(ts, object, name);
  return item && ts.isArrayLiteralExpression(item.initializer)
    ? item.initializer.elements.filter(ts.isObjectLiteralExpression)
    : [];
};

const collectRegisteredRoutes = async repoRoot => {
  const dataRoot = path.join(repoRoot, 'apps/docs/src/modules/docs/data');
  if (!(await exists(dataRoot))) return new Set();

  const ts = getTypeScript();
  const routes = new Set();
  const entries = await readdir(dataRoot, { withFileTypes: true });
  const files = entries
    .filter(
      entry =>
        entry.isFile() &&
        entry.name.endsWith('.ts') &&
        !['comparison.ts', 'index.ts', 'module.ts', 'sections.ts', 'types.ts'].includes(entry.name),
    )
    .map(entry => path.join(dataRoot, entry.name));

  for (const file of files) {
    const moduleId = path.basename(file, '.ts');
    const source = await readFile(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    routes.add(`/${moduleId}`);

    const visit = node => {
      if (ts.isVariableDeclaration(node) && ts.isArrayLiteralExpression(node.initializer)) {
        for (const section of node.initializer.elements.filter(ts.isObjectLiteralExpression)) {
          const sectionId = stringProperty(ts, section, 'id');
          const sectionBase = sectionId ? `/${moduleId}/${sectionId}` : `/${moduleId}`;
          if (sectionId) routes.add(sectionBase);

          for (const page of arrayProperty(ts, section, 'pages')) {
            const pageId = stringProperty(ts, page, 'id');
            if (!pageId) continue;
            const pageRoute = `${sectionBase}/${pageId}`;
            routes.add(pageRoute);

            for (const child of arrayProperty(ts, page, 'children')) {
              const childId = stringProperty(ts, child, 'id');
              if (childId) routes.add(`${pageRoute}/${childId}`);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return routes;
};

const previewCandidates = (directory, id, language) => {
  if (/\.[cm]?[jt]sx?$/.test(id) || id.endsWith('.json')) {
    return [path.join(directory, id)];
  }

  return [
    path.join(directory, `${id}.${language}.demo.tsx`),
    path.join(directory, `${id}.demo.tsx`),
    path.join(directory, `${id}.zh.demo.tsx`),
    path.join(directory, `${id}.en.demo.tsx`),
  ];
};

const validateFile = async ({ contentsRoot, file, registeredRoutes, repoRoot }) => {
  const errors = [];
  const content = await readFile(file, 'utf8');
  const language = languageOf(file);
  const label = relativeLabel(repoRoot, file);

  for (const route of collectInternalLinks(content)) {
    const resolved = await routeTarget({ contentsRoot, language, registeredRoutes, route });
    if (!resolved) continue;
    if (!resolved.exists) {
      errors.push(`${label}: internal route does not exist: ${route}`);
      continue;
    }
    if (resolved.anchor) {
      if (!resolved.target) {
        errors.push(`${label}: anchor target has no MDX source: ${route}`);
        continue;
      }
      const targetContent = await readFile(resolved.target, 'utf8');
      const anchors = await collectAnchorIds(targetContent);
      if (!anchors.has(resolved.anchor)) {
        errors.push(`${label}: anchor does not exist: ${route}`);
      }
    }
  }

  for (const source of collectSourceLinks(content)) {
    const target = path.resolve(repoRoot, source.path);
    if (!(await exists(target))) {
      errors.push(`${label}: SourceLinks path does not exist: ${source.path}`);
      continue;
    }

    const lineCount = physicalLineCount(await readFile(target, 'utf8'));
    const startLine = source.startLine ?? 1;
    const endLine = source.endLine ?? startLine;
    if (startLine < 1) {
      errors.push(`${label}: SourceLinks startLine must be >= 1: ${source.path}`);
    }
    if (endLine < startLine) {
      errors.push(`${label}: SourceLinks endLine precedes startLine: ${source.path}`);
    }
    if (endLine > lineCount) {
      errors.push(`${label}: SourceLinks endLine ${endLine} exceeds ${lineCount} lines: ${source.path}`);
    }
  }

  for (const id of collectPreviewIds(content)) {
    const candidates = previewCandidates(path.dirname(file), id, language);
    const matches = await Promise.all(candidates.map(exists));
    if (!matches.some(Boolean)) {
      errors.push(`${label}: ComponentPreview demo does not exist: ${id}`);
    }
  }

  return {
    content,
    errors,
    headings: await collectHeadingData(content),
    previews: collectPreviewIds(content),
    sourceLinks: collectSourceLinks(content),
  };
};

const comparePeers = (repoRoot, directory, zh, en) => {
  const errors = [];
  const label = relativeLabel(repoRoot, directory);
  const zhLevels = zh.headings.map(({ level }) => level).join(',');
  const enLevels = en.headings.map(({ level }) => level).join(',');

  if (zhLevels !== enLevels) {
    errors.push(`${label}: bilingual heading levels differ (${zhLevels} vs ${enLevels})`);
  }
  if (zh.previews.length !== en.previews.length) {
    errors.push(`${label}: bilingual ComponentPreview counts differ (${zh.previews.length} vs ${en.previews.length})`);
  }
  if (zh.sourceLinks.length !== en.sourceLinks.length) {
    errors.push(`${label}: bilingual SourceLinks counts differ (${zh.sourceLinks.length} vs ${en.sourceLinks.length})`);
  }

  return errors;
};

/**
 * Audit retikz docs files that can be validated deterministically.
 */
export const auditDocs = async ({ contentsRoot, repoRoot, scope = '.' }) => {
  const scopeRoot = path.resolve(contentsRoot, scope);
  const files = (await walk(scopeRoot)).filter(file => /index\.(?:zh|en)\.mdx$/.test(file));
  const directories = [...new Set(files.map(file => path.dirname(file)))].sort();
  const errors = [];
  const registeredRoutes = await collectRegisteredRoutes(repoRoot);
  let checkedPages = 0;

  for (const directory of directories) {
    const zhFile = path.join(directory, 'index.zh.mdx');
    const enFile = path.join(directory, 'index.en.mdx');
    const hasZh = await exists(zhFile);
    const hasEn = await exists(enFile);
    const isBlog = slash(path.relative(contentsRoot, directory)).startsWith('blog/');

    if (!hasZh) {
      errors.push(`${relativeLabel(repoRoot, directory)}: missing bilingual peer index.zh.mdx`);
    }
    if (!hasEn && !isBlog) {
      errors.push(`${relativeLabel(repoRoot, directory)}: missing bilingual peer index.en.mdx`);
    }

    const zh = hasZh ? await validateFile({ contentsRoot, file: zhFile, registeredRoutes, repoRoot }) : undefined;
    const en = hasEn ? await validateFile({ contentsRoot, file: enFile, registeredRoutes, repoRoot }) : undefined;

    if (zh) errors.push(...zh.errors);
    if (en) errors.push(...en.errors);
    if (zh && en) errors.push(...comparePeers(repoRoot, directory, zh, en));
    checkedPages += 1;
  }

  return { checkedPages, errors };
};

const parseCli = argv => {
  let scope = '.';
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--scope') scope = argv[index + 1] ?? scope;
    if (argv[index].startsWith('--scope=')) scope = argv[index].slice(8);
  }
  return { scope };
};

const runCli = async () => {
  const repoRoot = process.cwd();
  const contentsRoot = path.join(repoRoot, 'apps/docs/src/modules/docs/contents');
  if (!(await exists(contentsRoot))) {
    throw new Error(`Run from the repository root; missing ${contentsRoot}`);
  }

  const { scope } = parseCli(process.argv.slice(2));
  const result = await auditDocs({ contentsRoot, repoRoot, scope });

  if (result.errors.length > 0) {
    console.error(`Docs integrity failed (${result.errors.length} issues):`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Docs integrity passed (${result.checkedPages} pages, scope: ${scope}).`);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await runCli();
}

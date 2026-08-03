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
  object?.properties.find(
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

const objectProperty = (ts, object, name) => {
  const item = property(ts, object, name);
  return item && ts.isObjectLiteralExpression(item.initializer) ? item.initializer : undefined;
};

const collectDocsData = async repoRoot => {
  const dataRoot = path.join(repoRoot, 'apps/docs/src/modules/docs/data');
  if (!(await exists(dataRoot))) {
    return { registeredRoutes: new Set(), showcaseDataErrors: new Map(), showcasePages: new Map() };
  }

  const ts = getTypeScript();
  const routes = new Set();
  const showcaseDataErrors = new Map();
  const showcasePages = new Map();
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
    const dataLabel = relativeLabel(repoRoot, file);
    routes.add(`/${moduleId}`);

    const visitPage = (page, base) => {
      const pageId = stringProperty(ts, page, 'id');
      if (!pageId) return;

      const pageRoute = `${base}/${pageId}`;
      routes.add(pageRoute);

      const meta = objectProperty(ts, page, 'meta');
      const showcase = objectProperty(ts, meta, 'showcase');
      const layout = stringProperty(ts, meta, 'layout');
      const preview = stringProperty(ts, showcase, 'preview');
      const dataErrors = [];
      if (layout === 'showcase') {
        showcasePages.set(pageRoute, { preview });
        if (showcase === undefined) {
          dataErrors.push(`${dataLabel}: ${pageRoute}.meta.showcase: metadata is required`);
        } else if (preview === undefined) {
          dataErrors.push(`${dataLabel}: ${pageRoute}.meta.showcase.preview: string literal is required`);
        }
      } else if (showcase !== undefined) {
        dataErrors.push(`${dataLabel}: ${pageRoute}.meta.layout: "showcase" is required by showcase metadata`);
      }
      if (dataErrors.length > 0) showcaseDataErrors.set(pageRoute, dataErrors);

      for (const child of arrayProperty(ts, page, 'children')) visitPage(child, pageRoute);
    };

    const visit = node => {
      if (ts.isVariableDeclaration(node) && ts.isArrayLiteralExpression(node.initializer)) {
        for (const section of node.initializer.elements.filter(ts.isObjectLiteralExpression)) {
          const sectionId = stringProperty(ts, section, 'id');
          const sectionBase = sectionId ? `/${moduleId}/${sectionId}` : `/${moduleId}`;
          if (sectionId) routes.add(sectionBase);

          for (const page of arrayProperty(ts, section, 'pages')) visitPage(page, sectionBase);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return { registeredRoutes: routes, showcaseDataErrors, showcasePages };
};

const collectFrontmatter = content => {
  const block = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const values = new Map();
  if (!block) return values;

  for (const line of block[1].split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/);
    if (!match) continue;
    values.set(match[1], match[2].replace(/^(['"])(.*)\1$/, '$2'));
  }

  return values;
};

const scanBalanced = (source, start, open, close) => {
  let depth = 0;
  let quote;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== undefined) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === open) depth += 1;
    if (character === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
};

const collectShowcaseTags = content => {
  const tags = [];
  let cursor = 0;

  while (cursor < content.length) {
    const start = content.indexOf('<ShowcaseGallery', cursor);
    if (start < 0) break;

    let braceDepth = 0;
    let quote;
    let escaped = false;
    let end = -1;
    for (let index = start; index < content.length; index += 1) {
      const character = content[index];
      if (quote !== undefined) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === quote) quote = undefined;
        continue;
      }
      if (character === "'" || character === '"' || character === '`') {
        quote = character;
        continue;
      }
      if (character === '{') braceDepth += 1;
      if (character === '}') braceDepth -= 1;
      if (character === '>' && braceDepth === 0) {
        end = index;
        break;
      }
    }

    if (end < 0) break;
    tags.push(content.slice(start, end + 1));
    cursor = end + 1;
  }

  return tags;
};

const expressionAttribute = (tag, name) => {
  const match = new RegExp(`\\b${name}\\s*=\\s*\\{`).exec(tag);
  if (!match) return undefined;
  const start = match.index + match[0].length - 1;
  const end = scanBalanced(tag, start, '{', '}');
  return end < 0 ? undefined : tag.slice(start + 1, end);
};

const parseExpression = expression => {
  const ts = getTypeScript();
  const sourceFile = ts.createSourceFile(
    'showcase-expression.ts',
    `const value = ${expression};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const statement = sourceFile.statements.find(ts.isVariableStatement);
  return statement?.declarationList.declarations[0]?.initializer;
};

const collectPreviewFiles = (ts, preview, fieldPath) => {
  const errors = [];
  const files = [];
  const item = property(ts, preview, 'files');
  if (!item) return { errors: [`${fieldPath}: static string or array is required`], files };
  if (ts.isStringLiteral(item.initializer)) return { errors, files: [item.initializer.text] };
  if (!ts.isArrayLiteralExpression(item.initializer)) {
    return { errors: [`${fieldPath}: static string or array is required`], files };
  }

  for (let index = 0; index < item.initializer.elements.length; index += 1) {
    const element = item.initializer.elements[index];
    if (ts.isStringLiteral(element)) {
      files.push(element.text);
      continue;
    }
    if (ts.isObjectLiteralExpression(element)) {
      const file = stringProperty(ts, element, 'file');
      if (file !== undefined) {
        files.push(file);
        continue;
      }
    }
    errors.push(`${fieldPath}[${index}]: static string or { file } is required`);
  }

  return { errors, files };
};

const collectShowcaseExamples = content => {
  const ts = getTypeScript();
  const examples = [];
  const errors = [];

  for (const tag of collectShowcaseTags(content)) {
    const expression = expressionAttribute(tag, 'examples');
    const initializer = expression === undefined ? undefined : parseExpression(expression);
    if (!initializer || !ts.isArrayLiteralExpression(initializer)) {
      errors.push('ShowcaseGallery.examples: static array is required');
      continue;
    }

    for (let index = 0; index < initializer.elements.length; index += 1) {
      const element = initializer.elements[index];
      const examplePath = `examples[${index}]`;
      if (!ts.isObjectLiteralExpression(element)) {
        errors.push(`${examplePath}: static object is required`);
        continue;
      }
      const preview = objectProperty(ts, element, 'preview');
      if (preview === undefined) {
        errors.push(`${examplePath}.preview: static object is required`);
        continue;
      }

      const fileResult = collectPreviewFiles(ts, preview, `${examplePath}.preview.files`);
      errors.push(...fileResult.errors);
      const controlsItem = property(ts, preview, 'controls');
      let controls;
      if (controlsItem !== undefined) {
        if (!ts.isObjectLiteralExpression(controlsItem.initializer)) {
          errors.push(`${examplePath}.preview.controls: static object is required`);
        } else {
          controls = stringProperty(ts, controlsItem.initializer, 'name');
          if (controls === undefined) {
            errors.push(`${examplePath}.preview.controls.name: static string is required`);
          }
        }
      }

      const id = stringProperty(ts, element, 'id');
      if (id === undefined) errors.push(`${examplePath}.id: static string is required`);
      examples.push({
        id,
        index,
        files: fileResult.files,
        controls,
      });
    }
  }

  return { errors, examples };
};

const constObjectValues = (ts, sourceFile, name) => {
  const values = new Set();
  const visit = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) {
      const initializer = ts.isAsExpression(node.initializer) ? node.initializer.expression : node.initializer;
      if (ts.isObjectLiteralExpression(initializer)) {
        for (const item of initializer.properties) {
          if (ts.isPropertyAssignment(item) && ts.isStringLiteral(item.initializer)) values.add(item.initializer.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return values;
};

const collectShowcaseTaxonomy = async repoRoot => {
  const file = path.join(repoRoot, 'apps/docs/src/modules/docs/components/showcase/frontmatter.ts');
  if (!(await exists(file))) return undefined;

  const ts = getTypeScript();
  const source = await readFile(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return {
    family: constObjectValues(ts, sourceFile, 'ShowcaseFamily'),
    usage: constObjectValues(ts, sourceFile, 'ShowcaseUsage'),
  };
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

const localizedPreviewCandidates = (directory, id, language) => {
  if (/\.[cm]?[jt]sx?$/.test(id) || id.endsWith('.json')) return [path.join(directory, id)];
  return [path.join(directory, `${id}.${language}.demo.tsx`), path.join(directory, `${id}.demo.tsx`)];
};

const controlsCandidates = (directory, name, language) =>
  language === 'en'
    ? [path.join(directory, `${name}.en.controls.ts`)]
    : [path.join(directory, `${name}.zh.controls.ts`), path.join(directory, `${name}.controls.ts`)];

const anyExists = async candidates => (await Promise.all(candidates.map(exists))).some(Boolean);

const validateFile = async ({ contentsRoot, file, registeredRoutes, repoRoot, showcase, showcaseTaxonomy }) => {
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

  if (showcase !== undefined) {
    const directory = path.dirname(file);
    const frontmatter = collectFrontmatter(content);
    const showcaseExamples = collectShowcaseExamples(content);
    const { examples } = showcaseExamples;
    errors.push(...showcaseExamples.errors.map(error => `${label}: ${error}`));

    for (const field of ['family', 'usage']) {
      const value = frontmatter.get(field);
      if (value === undefined || value.length === 0) {
        errors.push(`${label}: frontmatter.${field}: value is required`);
      } else if (!showcaseTaxonomy?.[field]?.has(value)) {
        errors.push(`${label}: frontmatter.${field}: unsupported value: ${value}`);
      }
    }

    if (showcase.preview !== undefined) {
      if (!(await anyExists(localizedPreviewCandidates(directory, showcase.preview, language)))) {
        errors.push(`${label}: showcase.preview: demo does not exist: ${showcase.preview}`);
      }
      if (!examples.some(example => example.id === showcase.preview || example.files[0] === showcase.preview)) {
        errors.push(`${label}: showcase.preview: does not match a ShowcaseGallery example: ${showcase.preview}`);
      }
    }

    if (examples.length === 0) errors.push(`${label}: ShowcaseGallery.examples: no static examples found`);
    for (const example of examples) {
      const exampleIndex = example.index;
      for (let fileIndex = 0; fileIndex < example.files.length; fileIndex += 1) {
        const id = example.files[fileIndex];
        const candidates =
          fileIndex === 0 ? localizedPreviewCandidates(directory, id, language) : [path.join(directory, id)];
        if (!(await anyExists(candidates))) {
          const kind = fileIndex === 0 ? 'demo' : 'file';
          errors.push(`${label}: examples[${exampleIndex}].preview.files[${fileIndex}]: ${kind} does not exist: ${id}`);
        }
      }

      if (
        example.controls !== undefined &&
        !(await anyExists(controlsCandidates(directory, example.controls, language)))
      ) {
        errors.push(
          `${label}: examples[${exampleIndex}].preview.controls.name: controls do not exist: ${example.controls}`,
        );
      }
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
  const { registeredRoutes, showcaseDataErrors, showcasePages } = await collectDocsData(repoRoot);
  const showcaseTaxonomy = await collectShowcaseTaxonomy(repoRoot);
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

    const route = `/${slash(path.relative(contentsRoot, directory))}`;
    const showcase = showcasePages.get(route);
    errors.push(...(showcaseDataErrors.get(route) ?? []));
    const zh = hasZh
      ? await validateFile({ contentsRoot, file: zhFile, registeredRoutes, repoRoot, showcase, showcaseTaxonomy })
      : undefined;
    const en = hasEn
      ? await validateFile({ contentsRoot, file: enFile, registeredRoutes, repoRoot, showcase, showcaseTaxonomy })
      : undefined;

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

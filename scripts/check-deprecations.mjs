import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const DeprecatedDiagnosticCodes = new Set([6385, 6387]);

const isTypeScriptPath = filePath => /\.(?:ts|tsx)$/.test(filePath);

const splitGitOutput = output => output.split(/\r?\n/).filter(Boolean);

const toDeprecatedDiagnostic = diagnostic => {
  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0);

  return {
    column: position.character + 1,
    fileName: diagnostic.file.fileName,
    line: position.line + 1,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  };
};

export const collectDeprecatedDiagnostics = ({ rootNames, options }) => {
  const program = ts.createProgram({ options, rootNames });

  return rootNames
    .flatMap(rootName => {
      const sourceFile = program.getSourceFile(rootName);
      return sourceFile === undefined ? [] : program.getSuggestionDiagnostics(sourceFile);
    })
    .filter(diagnostic => DeprecatedDiagnosticCodes.has(diagnostic.code) && diagnostic.file !== undefined)
    .map(toDeprecatedDiagnostic);
};

export const formatDeprecatedDiagnostic = diagnostic =>
  `${path.normalize(diagnostic.fileName)}:${diagnostic.line}:${diagnostic.column}: deprecated API: ${diagnostic.message}`;

export const filterTypeScriptPaths = paths => paths.filter(isTypeScriptPath);

const runGit = (args, cwd) => splitGitOutput(execFileSync('git', args, { cwd, encoding: 'utf8' }));

const loadTypeScriptConfiguration = cwd => {
  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, 'tsconfig.json');

  if (configPath === undefined) {
    throw new Error(`Cannot find tsconfig.json from ${cwd}`);
  }

  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  }

  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath), undefined, configPath);
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
  }

  return parsed;
};

const resolveRootNames = ({ changed, cwd }) => {
  const configuration = loadTypeScriptConfiguration(cwd);
  if (!changed) {
    return configuration.fileNames;
  }

  const changedPaths = [
    ...runGit(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'], cwd),
    ...runGit(['ls-files', '--others', '--exclude-standard'], cwd),
  ];

  return [...new Set(filterTypeScriptPaths(changedPaths))]
    .map(filePath => path.resolve(cwd, filePath))
    .filter(existsSync);
};

export const runDeprecationCheck = ({ changed, cwd = process.cwd() }) => {
  const configuration = loadTypeScriptConfiguration(cwd);
  const rootNames = resolveRootNames({ changed, cwd });

  if (rootNames.length === 0) {
    console.log('No changed TypeScript files to check for deprecated APIs.');
    return 0;
  }

  const diagnostics = collectDeprecatedDiagnostics({ options: configuration.options, rootNames });
  if (diagnostics.length === 0) {
    console.log(`No deprecated APIs found in ${rootNames.length} TypeScript file(s).`);
    return 0;
  }

  for (const diagnostic of diagnostics) {
    console.error(formatDeprecatedDiagnostic(diagnostic));
  }
  console.error(`Found ${diagnostics.length} deprecated API use(s).`);
  return 1;
};

const isMainModule = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const args = new Set(process.argv.slice(2));
  if ([...args].some(arg => arg !== '--changed')) {
    console.error('Usage: node scripts/check-deprecations.mjs [--changed]');
    process.exitCode = 1;
  } else {
    process.exitCode = runDeprecationCheck({ changed: args.has('--changed') });
  }
}

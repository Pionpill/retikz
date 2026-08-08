import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { releaseGroups } from './release-groups.config.mjs';

const dependencyFields = ['dependencies', 'peerDependencies', 'optionalDependencies'];
const publishRootFields = ['main', 'module', 'types'];
const publishExportConditions = ['types', 'import', 'default'];

function getScriptPath() {
  return fileURLToPath(import.meta.url);
}

function getRepoRoot() {
  return path.resolve(path.dirname(getScriptPath()), '..');
}

function getPackageToGroup(releaseGroupsConfig) {
  const packageToGroup = new Map();
  const diagnostics = [];

  for (const [groupName, group] of Object.entries(releaseGroupsConfig)) {
    for (const packageName of group.packages) {
      if (packageToGroup.has(packageName)) {
        diagnostics.push(`${packageName} is declared in multiple release groups`);
        continue;
      }

      packageToGroup.set(packageName, groupName);
    }
  }

  return { packageToGroup, diagnostics };
}

function getWorkspaceDependencies(manifest) {
  return dependencyFields.flatMap(field =>
    Object.entries(manifest[field] ?? {}).map(([name, range]) => ({
      field,
      name,
      range,
    })),
  );
}

function expectedTargetsForSubpath(subpath) {
  const relativePath = subpath === '.' ? '' : `${subpath.slice(2)}/`;

  return {
    types: `./dist/types/${relativePath}index.d.ts`,
    import: `./dist/${relativePath}index.js`,
    default: `./dist/${relativePath}index.js`,
  };
}

function validateNoLegacyPublishValues({ packageName, value, valuePath, diagnostics }) {
  if (typeof value === 'string') {
    if (value.includes('.cjs')) {
      diagnostics.push(`${packageName} ${valuePath} must not reference .cjs`);
    }

    if (value.includes('dist/es')) {
      diagnostics.push(`${packageName} ${valuePath} must not reference dist/es`);
    }

    if (value.includes('dist/lib')) {
      diagnostics.push(`${packageName} ${valuePath} must not reference dist/lib`);
    }

    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = `${valuePath}.${key}`;

    if (key === 'require') {
      diagnostics.push(`${packageName} ${nestedPath} must not declare a require condition`);
    }

    validateNoLegacyPublishValues({
      packageName,
      value: nestedValue,
      valuePath: nestedPath,
      diagnostics,
    });
  }
}

/**
 * 校验可发布包的 ESM-only manifest 契约。
 *
 * @param {Record<string, unknown>} manifest package.json 内容。
 * @returns {Array<string>} 可操作的诊断信息。
 */
export function validateEsmPublishContract(manifest) {
  const packageName = typeof manifest.name === 'string' ? manifest.name : '<unnamed package>';
  const diagnostics = [];

  if (manifest.type !== 'module') {
    diagnostics.push(`${packageName} must set type to module`);
  }

  if (manifest.engines?.node !== '>=24') {
    diagnostics.push(`${packageName} must set engines.node to >=24`);
  }

  const sourceExports = manifest.exports;
  const publishConfig = manifest.publishConfig;
  const publishExports = publishConfig?.exports;

  if (!sourceExports || typeof sourceExports !== 'object' || Array.isArray(sourceExports)) {
    diagnostics.push(`${packageName} must declare source exports as an object`);
  }

  if (!publishConfig || typeof publishConfig !== 'object' || Array.isArray(publishConfig)) {
    diagnostics.push(`${packageName} must declare publishConfig as an object`);
    return diagnostics;
  }

  validateNoLegacyPublishValues({
    packageName,
    value: publishConfig,
    valuePath: 'publishConfig',
    diagnostics,
  });

  if (!publishExports || typeof publishExports !== 'object' || Array.isArray(publishExports)) {
    diagnostics.push(`${packageName} must declare publishConfig.exports as an object`);
    return diagnostics;
  }

  const sourceExportKeys = Object.keys(sourceExports ?? {}).sort();
  const publishExportKeys = Object.keys(publishExports).sort();

  if (JSON.stringify(sourceExportKeys) !== JSON.stringify(publishExportKeys)) {
    diagnostics.push(
      `${packageName} source and publish export keys must match: source=${sourceExportKeys.join(',')} publish=${publishExportKeys.join(',')}`,
    );
  }

  for (const [subpath, exportTarget] of Object.entries(publishExports)) {
    if (!exportTarget || typeof exportTarget !== 'object' || Array.isArray(exportTarget)) {
      diagnostics.push(`${packageName} publishConfig.exports[${subpath}] must be a condition object`);
      continue;
    }

    const conditionKeys = Object.keys(exportTarget);

    if (JSON.stringify(conditionKeys) !== JSON.stringify(publishExportConditions)) {
      diagnostics.push(
        `${packageName} publishConfig.exports[${subpath}] condition order must be types, import, default`,
      );
    }

    const expectedTargets = expectedTargetsForSubpath(subpath);

    for (const condition of publishExportConditions) {
      if (exportTarget[condition] !== expectedTargets[condition]) {
        diagnostics.push(
          `${packageName} publishConfig.exports[${subpath}].${condition} must be ${expectedTargets[condition]}`,
        );
      }
    }
  }

  const rootExport = publishExports['.'];

  if (rootExport && typeof rootExport === 'object' && !Array.isArray(rootExport)) {
    const expectedRootFields = {
      main: rootExport.import,
      module: rootExport.import,
      types: rootExport.types,
    };

    for (const field of publishRootFields) {
      if (publishConfig[field] !== expectedRootFields[field]) {
        diagnostics.push(`${packageName} publishConfig.${field} must be ${expectedRootFields[field]}`);
      }
    }
  } else {
    for (const field of publishRootFields) {
      if (Object.hasOwn(publishConfig, field)) {
        diagnostics.push(`${packageName} must not declare publishConfig.${field} without a root export`);
      }
    }
  }

  return diagnostics;
}

function validateReleaseGroupMetadata({ manifest, packageToGroup, releaseGroupsConfig }) {
  const diagnostics = [];
  const expectedGroupName = packageToGroup.get(manifest.name);

  if (!expectedGroupName) {
    diagnostics.push(`${manifest.name} is not declared in release-groups.config.mjs`);
    return diagnostics;
  }

  const expectedGroup = releaseGroupsConfig[expectedGroupName];
  const metadata = manifest.retikz;

  if (!metadata || typeof metadata !== 'object') {
    diagnostics.push(`${manifest.name} must declare retikz release metadata`);
    return diagnostics;
  }

  if (metadata.publishable !== true) {
    diagnostics.push(`${manifest.name} must set retikz.publishable to true`);
  }

  if (metadata.releaseGroup !== expectedGroupName) {
    diagnostics.push(
      `${manifest.name} has retikz.releaseGroup ${metadata.releaseGroup}; expected ${expectedGroupName}`,
    );
  }

  if (metadata.domain !== expectedGroup.domain) {
    diagnostics.push(`${manifest.name} has retikz.domain ${metadata.domain}; expected ${expectedGroup.domain}`);
  }

  return diagnostics;
}

function validateGroupVersions({ packageRecords, packageToGroup }) {
  const versionsByGroup = new Map();
  const diagnostics = [];

  for (const { manifest } of packageRecords) {
    const groupName = packageToGroup.get(manifest.name);

    if (!groupName) {
      continue;
    }

    const versions = versionsByGroup.get(groupName) ?? new Map();
    versions.set(manifest.name, manifest.version);
    versionsByGroup.set(groupName, versions);
  }

  for (const [groupName, versions] of versionsByGroup) {
    const uniqueVersions = new Set(versions.values());

    if (uniqueVersions.size <= 1) {
      continue;
    }

    diagnostics.push(
      `${groupName} release group has mixed versions: ${Array.from(versions)
        .map(([packageName, version]) => `${packageName}@${version}`)
        .join(', ')}`,
    );
  }

  return diagnostics;
}

function validateDependencyPolicy({ manifest, packageToGroup, releaseGroupsConfig }) {
  const diagnostics = [];
  const sourceGroupName = packageToGroup.get(manifest.name);

  if (!sourceGroupName) {
    return diagnostics;
  }

  const sourceGroup = releaseGroupsConfig[sourceGroupName];

  for (const dependency of getWorkspaceDependencies(manifest)) {
    const targetGroupName = packageToGroup.get(dependency.name);

    if (!targetGroupName) {
      continue;
    }

    const targetGroup = releaseGroupsConfig[targetGroupName];
    const expectedRange = sourceGroupName === targetGroupName ? 'workspace:*' : 'workspace:^';

    if (dependency.range !== expectedRange) {
      diagnostics.push(
        `${manifest.name} depends on ${dependency.name} with ${dependency.range}; expected ${expectedRange} in ${dependency.field}`,
      );
    }

    if (
      sourceGroupName !== targetGroupName &&
      sourceGroup.kind === 'feature' &&
      targetGroup.kind === 'feature' &&
      targetGroup.domain !== 'library'
    ) {
      diagnostics.push(
        `${manifest.name} cannot depend on feature group ${targetGroupName} from feature group ${sourceGroupName}`,
      );
    }
  }

  return diagnostics;
}

export async function readPackageRecords(repoRoot = getRepoRoot()) {
  const packagesRoot = path.join(repoRoot, 'packages');
  const records = [];

  for (const domainEntry of await readdir(packagesRoot, { withFileTypes: true })) {
    if (!domainEntry.isDirectory()) {
      continue;
    }

    const domainPath = path.join(packagesRoot, domainEntry.name);

    for (const packageEntry of await readdir(domainPath, { withFileTypes: true })) {
      if (!packageEntry.isDirectory()) {
        continue;
      }

      const packagePath = path.join(domainPath, packageEntry.name, 'package.json');

      if (!existsSync(packagePath)) {
        continue;
      }

      records.push({
        path: path.relative(repoRoot, packagePath).replaceAll(path.sep, '/'),
        manifest: JSON.parse(await readFile(packagePath, 'utf8')),
      });
    }
  }

  return records;
}

export function validateReleaseGroupPackages({ releaseGroups: releaseGroupsConfig, packageRecords }) {
  const { packageToGroup, diagnostics } = getPackageToGroup(releaseGroupsConfig);
  const packageNames = new Set(packageRecords.map(({ manifest }) => manifest.name));

  for (const [groupName, group] of Object.entries(releaseGroupsConfig)) {
    for (const packageName of group.packages) {
      if (!packageNames.has(packageName)) {
        diagnostics.push(`${packageName} is declared in release group ${groupName} but has no package.json`);
      }
    }
  }

  for (const record of packageRecords) {
    if (record.manifest.private === true) {
      continue;
    }

    diagnostics.push(
      ...validateReleaseGroupMetadata({
        manifest: record.manifest,
        packageToGroup,
        releaseGroupsConfig,
      }),
      ...validateDependencyPolicy({
        manifest: record.manifest,
        packageToGroup,
        releaseGroupsConfig,
      }),
      ...validateEsmPublishContract(record.manifest),
    );
  }

  diagnostics.push(...validateGroupVersions({ packageRecords, packageToGroup }));

  return diagnostics;
}

async function main() {
  const packageRecords = await readPackageRecords();
  const diagnostics = validateReleaseGroupPackages({
    releaseGroups,
    packageRecords,
  });

  if (diagnostics.length > 0) {
    console.error(`Release group check failed with ${diagnostics.length} diagnostic(s):`);

    for (const diagnostic of diagnostics) {
      console.error(`- ${diagnostic}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    `Release group check passed for ${packageRecords.length} package(s) across ${Object.keys(releaseGroups).length} group(s).`,
  );
}

if (process.argv[1] === getScriptPath()) {
  await main();
}

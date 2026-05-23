import { PACKAGE_IDS, type PackageId, type Release } from '@/data/changelog.types';

/** 数据中实际出现的包标识,按 PACKAGE_IDS 的固定顺序 */
export const allPackageIds = (releases: Array<Release>): Array<PackageId> => {
  const present = new Set<PackageId>();
  for (const release of releases) {
    for (const block of release.packages) present.add(block.pkg);
  }
  return PACKAGE_IDS.filter(id => present.has(id));
};

/** 按选中包过滤:逐里程碑筛包块,丢弃过滤后无块的里程碑;不修改入参 */
export const filterReleases = (releases: Array<Release>, selected: ReadonlySet<PackageId>): Array<Release> =>
  releases
    .map(release => ({ ...release, packages: release.packages.filter(block => selected.has(block.pkg)) }))
    .filter(release => release.packages.length > 0);

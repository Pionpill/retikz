import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { lowerTables, lowerTableWithArtifacts } from '@retikz/table';
import { useEffect, useRef } from 'react';

import type { ReactTableRuntime } from './table-runtime';

/** 共享 standalone Table runtime view，不作为公开组件导出 */
export const TableRuntimeView: FC<Readonly<{ runtime: ReactTableRuntime }>> = ({ runtime }) => {
  const { spec, datasets, lowerOptions, composites, onManifest, display } = runtime;
  const notifiedManifestKey = useRef<string>();
  const manifest =
    onManifest === undefined ? undefined : lowerTableWithArtifacts(spec, datasets, lowerOptions).manifest;
  const manifestKey = manifest === undefined ? undefined : JSON.stringify(manifest);

  useEffect(() => {
    if (manifest === undefined || manifestKey === undefined || onManifest === undefined) return;
    if (notifiedManifestKey.current === manifestKey) return;
    notifiedManifestKey.current = manifestKey;
    onManifest(manifest);
  }, [manifest, manifestKey, onManifest]);

  return (
    <Layout
      ir={{ version: 1, type: 'scene', children: [spec] }}
      composites={[...lowerTables(datasets, lowerOptions), ...composites]}
      {...display}
    />
  );
};

import type {
  AnyCompositeDefinition,
  CompileOptions,
  CompileResult,
  CompositeArtifactOf,
  CompositeCompileArtifact,
} from '@retikz/core';
import type { z } from 'zod';

import type {
  AnyCellFormatterDefinition,
  AnyCellPresentationDefinition,
  AnyTableStructureDefinition,
  TableLayoutManifest,
  TableLayoutManifestSchema,
} from '../contract';

/** Table lowering 的运行时扩展选项 */
export type LowerTablesOptions = Readonly<{
  /** 用户自定义 structure definitions */
  structureDefinitions?: ReadonlyArray<AnyTableStructureDefinition>;
  /** 用户自定义 Cell presentation definitions */
  presentationDefinitions?: ReadonlyArray<AnyCellPresentationDefinition>;
  /** 用户自定义 Cell formatter definitions */
  formatterDefinitions?: ReadonlyArray<AnyCellFormatterDefinition>;
}>;

/** Table layout-aware composite 的 typed artifact */
export type TableCompileArtifact = CompositeCompileArtifact<
  'table',
  'table',
  z.output<typeof TableLayoutManifestSchema>
>;

/** 直接编译单个 Table 的分层选项 */
export type CompileTableOptions<TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []> = Readonly<{
  /** Table structure 与 presentation definitions */
  lower?: LowerTablesOptions;
  /** 其余 Core compile options 与额外 composite definitions */
  compile?: CompileOptions<TComposites>;
}>;

/** 单次 Table compile 的 Scene、完整 artifacts 与精确根 manifest */
export type CompileTableResult<TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []> = Readonly<
  CompileResult<TableCompileArtifact | CompositeArtifactOf<TComposites[number]>> & {
    /** exact root Table artifact 的同一 immutable value 引用 */
    manifest: TableLayoutManifest;
  }
>;

const DEFAULT_DEV_SLOT = '01';
const DOCS_DEV_PORT_BASE = 7100;
const BENCH_DEV_PORT_BASE = 7200;

/** 校验显式服务端口并保留原始配置值用于诊断 */
const parseExplicitPort = (envName: string, rawPort: string): number => {
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${envName} must be an integer between 1 and 65535, received "${rawPort}"`);
  }

  return port;
};

/** 根据服务基数和本地工作区槽位解析稳定端口 */
const resolveDevPort = (envName: string, basePort: number, rawPort?: string, rawSlot?: string): number => {
  if (rawPort !== undefined) return parseExplicitPort(envName, rawPort);

  const slotValue = rawSlot ?? DEFAULT_DEV_SLOT;
  const slot = Number(slotValue);
  if (!Number.isInteger(slot) || slot < 0 || slot > 99) {
    throw new Error(`RETIKZ_DEV_SLOT must be an integer between 0 and 99, received "${slotValue}"`);
  }

  return basePort + slot;
};

/** 解析 Docs 开发服务端口 */
export const resolveDocsPort = (rawPort?: string, rawSlot?: string): number =>
  resolveDevPort('RETIKZ_DOCS_PORT', DOCS_DEV_PORT_BASE, rawPort, rawSlot);

/** 解析 Bench 开发服务端口 */
export const resolveBenchPort = (rawPort?: string, rawSlot?: string): number =>
  resolveDevPort('RETIKZ_BENCH_PORT', BENCH_DEV_PORT_BASE, rawPort, rawSlot);

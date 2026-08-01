/** 解析并校验 Bench 开发服务端口 */
export const resolveBenchPort = (rawPort = '6003'): number => {
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`RETIKZ_BENCH_PORT must be an integer between 1 and 65535, received "${rawPort}"`);
  }

  return port;
};

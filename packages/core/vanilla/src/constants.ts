/** 默认资源 id 前缀（确定性）；多实例同页须经 `options.idPrefix` 显式区分。SSR(`renderToSvgString`) 与 mount(`mountSvg`) 共用同一默认，避免两处漂移导致资源 id 失配。 */
export const DEFAULT_ID_PREFIX = 'r';

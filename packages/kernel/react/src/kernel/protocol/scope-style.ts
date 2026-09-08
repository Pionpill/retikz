import type { InputScope } from '@retikz/vanilla';

/** Scope 的级联视觉覆盖与后代默认通道，Layout 通过 rootScope 承载 */
export type ScopeStyleProps = Pick<InputScope, 'style' | 'defaults'>;

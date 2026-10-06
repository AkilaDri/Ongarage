import type { AiProvider } from './types';
import { rulesProvider } from './rulesProvider';

export * from './types';
export { normalise, rulesProvider } from './rulesProvider';

// Which provider answers. The apps always call getAi(); when the back end exists, an
// app installs a provider that calls the AI service (Claude, later Laya for routine
// decisions) with setAiProvider() at start-up — no screen changes.

let provider: AiProvider = rulesProvider;

export const getAi = (): AiProvider => provider;
export const setAiProvider = (p: AiProvider) => {
  provider = p;
};

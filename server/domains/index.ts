import { domainRegistry } from './registry.ts';
import { aicteDomainPack } from './aicte/index.ts';

// Register the baseline domain pack
domainRegistry.register(aicteDomainPack, true);

export * from './types.ts';
export * from './registry.ts';
export * from './aicte/index.ts';


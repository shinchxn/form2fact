import { DomainPack, DomainPackSchema } from './types.ts';
import { logger } from '../core/logger/index.ts';

export class DomainRegistry {
  private static instance: DomainRegistry;
  private packs: Map<string, Map<string, DomainPack>> = new Map(); // domainId -> (version -> DomainPack)
  private defaultVersions: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): DomainRegistry {
    if (!DomainRegistry.instance) {
      DomainRegistry.instance = new DomainRegistry();
    }
    return DomainRegistry.instance;
  }

  public register(pack: DomainPack, isDefaultVersion: boolean = true): void {
    const validation = DomainPackSchema.safeParse(pack);
    if (!validation.success) {
      throw new Error(`Domain pack validation failed for ${pack.id}@${pack.version}: ${validation.error.message}`);
    }

    if (!this.packs.has(pack.id)) {
      this.packs.set(pack.id, new Map());
    }

    const versionMap = this.packs.get(pack.id)!;
    versionMap.set(pack.version, pack);

    if (isDefaultVersion || !this.defaultVersions.has(pack.id)) {
      this.defaultVersions.set(pack.id, pack.version);
    }

    logger.info(`Registered domain pack: ${pack.name} [id: ${pack.id}, version: ${pack.version}]`);
  }

  public get(domainId: string, version?: string): DomainPack {
    const versionMap = this.packs.get(domainId);
    if (!versionMap || versionMap.size === 0) {
      throw new Error(`Domain pack '${domainId}' not found in registry`);
    }

    const targetVersion = version || this.defaultVersions.get(domainId);
    if (!targetVersion || !versionMap.has(targetVersion)) {
      throw new Error(`Domain pack '${domainId}' version '${targetVersion}' not found in registry`);
    }

    return versionMap.get(targetVersion)!;
  }

  public list(): { id: string; name: string; version: string; description: string; category: string }[] {
    const list: { id: string; name: string; version: string; description: string; category: string }[] = [];
    for (const [id, versions] of this.packs.entries()) {
      const defaultVer = this.defaultVersions.get(id);
      if (defaultVer && versions.has(defaultVer)) {
        const pack = versions.get(defaultVer)!;
        list.push({
          id: pack.id,
          name: pack.name,
          version: pack.version,
          description: pack.description,
          category: pack.category
        });
      }
    }
    return list;
  }

  public has(domainId: string): boolean {
    return this.packs.has(domainId);
  }
}

export const domainRegistry = DomainRegistry.getInstance();


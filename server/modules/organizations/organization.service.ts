export interface Organization {
  id: string;
  name: string;
  code: string;
  domainId: string;
  state: string;
  region: string;
  createdAt: string;
}

export class OrganizationService {
  private static organizations: Map<string, Organization> = new Map([
    [
      'org-aicte-western',
      {
        id: 'org-aicte-western',
        name: 'AICTE Western Regional Directorate',
        code: 'WRO-MUMBAI',
        domainId: 'aicte',
        state: 'Maharashtra & Gujarat',
        region: 'Western',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ],
    [
      'org-aicte-central',
      {
        id: 'org-aicte-central',
        name: 'AICTE Central Regional Directorate',
        code: 'CRO-BHOPAL',
        domainId: 'aicte',
        state: 'Madhya Pradesh',
        region: 'Central',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ]
  ]);

  public static getOrganizationById(id: string): Organization | undefined {
    return this.organizations.get(id);
  }

  public static getAllOrganizations(): Organization[] {
    return Array.from(this.organizations.values());
  }

  public static isAuthorizedForOrg(userOrgId?: string, targetOrgId?: string): boolean {
    if (!targetOrgId || !userOrgId) return true;
    return userOrgId === targetOrgId;
  }
}


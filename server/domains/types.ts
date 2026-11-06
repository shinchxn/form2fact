import { z } from 'zod';
import { Rule, DocumentType } from '../../src/types/index.ts';

export type NormalizationStrategy = 'date-iso' | 'number-float' | 'text-trimmed' | 'entity-name' | 'code-uppercase';

export interface FieldDefinition {
  name: string;
  label: string;
  description?: string;
  expectedType: 'string' | 'number' | 'date' | 'boolean';
  normalizationStrategy: NormalizationStrategy;
  aliases: string[];
  extractPatterns?: RegExp[];
  confidenceHeuristic?: number;
}

export interface DocumentDefinition {
  type: DocumentType | string;
  label: string;
  description: string;
  isMandatory: boolean;
  requiredFields: string[];
  statutoryReference?: string;
}

export type PairwiseClassificationLabel = 'MATCH' | 'MISMATCH' | 'MISSING' | 'UNCERTAIN' | 'NOT_COMPARABLE';

export interface ComparisonRelationship {
  id: string;
  name: string;
  sourceType: 'declaration' | 'document';
  sourceField: string;
  targetDocumentType: string;
  targetField: string;
  comparisonMethod: 'exact' | 'date-tenure' | 'numeric-threshold' | 'entity-concordance';
  toleranceThreshold?: number; // e.g. acreage tolerance (0.05)
  minTenureYears?: number;
  failureSeverity: 'Attention Required' | 'Material Discrepancy' | 'Information Missing' | 'Administrative Advisory';
  associatedRuleKey: string;
}

export interface DomainPack {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  documentTypes: DocumentDefinition[];
  fieldDefinitions: FieldDefinition[];
  comparisonRelationships: ComparisonRelationship[];
  rules: Rule[];
  metadata?: Record<string, unknown>;
}

export const DomainPackSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(2),
  version: z.string().min(1),
  description: z.string(),
  category: z.string(),
  documentTypes: z.array(z.object({
    type: z.string(),
    label: z.string(),
    description: z.string(),
    isMandatory: z.boolean(),
    requiredFields: z.array(z.string()),
    statutoryReference: z.string().optional()
  })),
  fieldDefinitions: z.array(z.object({
    name: z.string(),
    label: z.string(),
    description: z.string().optional(),
    expectedType: z.enum(['string', 'number', 'date', 'boolean']),
    normalizationStrategy: z.enum(['date-iso', 'number-float', 'text-trimmed', 'entity-name', 'code-uppercase']),
    aliases: z.array(z.string()),
    confidenceHeuristic: z.number().optional()
  })),
  comparisonRelationships: z.array(z.object({
    id: z.string(),
    name: z.string(),
    sourceType: z.enum(['declaration', 'document']),
    sourceField: z.string(),
    targetDocumentType: z.string(),
    targetField: z.string(),
    comparisonMethod: z.enum(['exact', 'date-tenure', 'numeric-threshold', 'entity-concordance']),
    toleranceThreshold: z.number().optional(),
    minTenureYears: z.number().optional(),
    failureSeverity: z.enum(['Attention Required', 'Material Discrepancy', 'Information Missing', 'Administrative Advisory']),
    associatedRuleKey: z.string()
  })),
  rules: z.array(z.any())
});


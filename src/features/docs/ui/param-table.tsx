import type { InputSchema, SchemaProperty } from '@/mock-bridge/tool-specs';
import { DataTable } from './data-table';

/** Human-readable constraints: allowed values, range, length, default. */
export function describeConstraints(property: SchemaProperty): string {
  const parts: string[] = [];
  if (property.enum) parts.push(`one of ${property.enum.join(', ')}`);
  if (property.minimum !== undefined && property.maximum !== undefined) {
    parts.push(`${property.minimum}–${property.maximum}`);
  }
  if (property.maxLength !== undefined) parts.push(`≤ ${property.maxLength} chars`);
  if (property.default !== undefined) parts.push(`default ${JSON.stringify(property.default)}`);
  return parts.join(' · ') || '—';
}

interface ParamTableProps {
  tool: string;
  schema: InputSchema;
}

/** Parameter reference rendered straight from a tool's JSON Schema. */
export function ParamTable({ tool, schema }: ParamTableProps) {
  const rows = Object.entries(schema.properties).map(([name, property]) => [
    name,
    property.type,
    schema.required.includes(name) ? 'yes' : 'no',
    describeConstraints(property),
    property.description,
  ]);
  return (
    <DataTable
      caption={`${tool} parameters`}
      columns={['Parameter', 'Type', 'Required', 'Constraints', 'Description']}
      rows={rows}
    />
  );
}

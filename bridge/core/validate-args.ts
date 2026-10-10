import type { InputSchema, SchemaProperty } from './tool-specs.ts';

export type ArgValue = string | number | boolean;
export type Validated = { ok: true; args: Record<string, ArgValue> } | { ok: false; message: string };

function typeProblem(name: string, property: SchemaProperty, value: unknown): string | null {
  if (property.type === 'integer') return Number.isInteger(value) ? null : `"${name}" must be an integer`;
  return typeof value === property.type ? null : `"${name}" must be a ${property.type}`;
}

function numberProblem(name: string, property: SchemaProperty, value: number): string | null {
  if (property.minimum !== undefined && value < property.minimum) return `"${name}" must be at least ${property.minimum}`;
  if (property.maximum !== undefined && value > property.maximum) return `"${name}" must be at most ${property.maximum}`;
  return null;
}

function stringProblem(name: string, property: SchemaProperty, value: string): string | null {
  if (property.maxLength !== undefined && value.length > property.maxLength) return `"${name}" exceeds ${property.maxLength} characters`;
  if (property.enum && !property.enum.includes(value)) return `"${name}" must be one of: ${property.enum.join(', ')}`;
  return null;
}

function rangeProblem(name: string, property: SchemaProperty, value: ArgValue): string | null {
  if (typeof value === 'number') return numberProblem(name, property, value);
  return typeof value === 'string' ? stringProblem(name, property, value) : null;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Checks tool arguments against the tool's schema and fills in defaults.
 * Unknown keys are refused: the schemas are closed.
 */
export function validateArgs(schema: InputSchema, input: unknown): Validated {
  const given = input === undefined ? {} : input;
  if (!isPlainObject(given)) return { ok: false, message: 'arguments must be an object' };

  const unknown = Object.keys(given).find((key) => !Object.hasOwn(schema.properties, key));
  if (unknown !== undefined) return { ok: false, message: `unknown argument "${unknown}"` };

  const args: Record<string, ArgValue> = {};
  for (const [name, property] of Object.entries(schema.properties)) {
    const value = given[name] ?? property.default;
    if (value === undefined) {
      if (schema.required.includes(name)) return { ok: false, message: `missing required argument "${name}"` };
      continue;
    }
    const problem = typeProblem(name, property, value) ?? rangeProblem(name, property, value as ArgValue);
    if (problem) return { ok: false, message: problem };
    args[name] = value as ArgValue;
  }
  return { ok: true, args };
}

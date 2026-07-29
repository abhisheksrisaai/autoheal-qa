import Ajv, { JSONSchemaType } from 'ajv';

/**
 * SchemaValidator - JSON Schema validation for API responses.
 */
export class SchemaValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  /**
   * Validates data against a JSON schema.
   */
  validate<T>(schema: JSONSchemaType<T>, data: unknown): {
    valid: boolean;
    errors: string[] | null;
  } {
    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    if (valid) {
      return { valid: true, errors: null };
    }

    const errors = (validate.errors || []).map(
      err => `${err.instancePath} ${err.message}`
    );
    return { valid: false, errors };
  }

  /**
   * Validates and throws if schema is invalid.
   */
  assertValid<T>(schema: JSONSchemaType<T>, data: unknown, label?: string): void {
    const result = this.validate(schema, data);
    if (!result.valid) {
      const message = `${label || 'Schema validation'} failed:\n${result.errors?.join('\n')}`;
      throw new Error(message);
    }
  }

  /**
   * Adds a custom schema for reference in other schemas.
   */
  addSchema(schema: object, key: string): void {
    this.ajv.addSchema(schema, key);
  }

  /**
   * Common API response schemas.
   */
  static get commonSchemas() {
    return {
      // Generic API response wrapper
      apiResponse: {
        type: 'object',
        properties: {
          status: { type: 'number' },
          data: { type: 'object' },
          message: { type: 'string' },
        },
        required: ['status'],
      } as const,

      // Paginated list response
      paginatedList: {
        type: 'object',
        properties: {
          items: { type: 'array' },
          total: { type: 'number' },
          page: { type: 'number' },
          pageSize: { type: 'number' },
        },
        required: ['items', 'total'],
      } as const,

      // Error response
      errorResponse: {
        type: 'object',
        properties: {
          status: { type: 'number' },
          error: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['status', 'error'],
      } as const,
    };
  }
}

/**
 * GraphQL Gateway Layer
 *
 * Translates incoming GraphQL queries/mutations into gateway action calls.
 * This is a lightweight SDL-first GraphQL executor that reuses existing
 * gateway handlers — no separate resolver logic needed.
 *
 * Supports:
 * - Queries (mapped to read actions)
 * - Mutations (mapped to write actions)
 * - Introspection (SDL schema served at GET /gateway?graphql)
 * - Variables, operation names, batched queries
 *
 * The schema is auto-generated from the route map — each gateway action
 * becomes a query or mutation field.
 */

import type { GatewayContext, Handler } from './core.ts';
import { routes } from './routes.ts';

// =============================================================================
// TYPES
// =============================================================================

interface GraphQLRequest {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

interface GraphQLResponse {
  data?: Record<string, unknown> | null;
  errors?: GraphQLError[];
}

interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: string[];
  extensions?: Record<string, unknown>;
}

interface ParsedOperation {
  type: 'query' | 'mutation';
  selections: ParsedSelection[];
}

interface ParsedSelection {
  fieldName: string;
  alias?: string;
  arguments: Record<string, unknown>;
}

// =============================================================================
// ACTION CLASSIFICATION
// =============================================================================

/** Actions that mutate data → GraphQL mutations. Everything else → queries. */
const MUTATION_ACTIONS = new Set([
  // Transfers
  'transfers.create', 'transfers.schedule', 'transfers.cancel',
  // Beneficiaries
  'beneficiaries.create', 'beneficiaries.delete',
  // Bill Pay
  'bills.create', 'bills.pay', 'bills.cancel',
  // RDC
  'rdc.deposit',
  // Cards
  'cards.lock', 'cards.unlock', 'cards.setLimit',
  // CMS
  'cms.content.create', 'cms.content.update', 'cms.content.delete',
  'cms.content.publish', 'cms.content.archive',
  'cms.channels.update',
  'cms.tokens.create', 'cms.tokens.revoke',
  // Experiments
  'experiments.create', 'experiments.update',
  'experiments.start', 'experiments.pause', 'experiments.resume', 'experiments.complete',
  'experiments.track',
  // Integrations
  'integrations.connect', 'integrations.disconnect',
  // Settings
  'passwordPolicy.update',
  'member.updateAddress',
  'cd.updateMaturityAction',
  // Activation
  'activation.verifyIdentity', 'activation.acceptTerms',
  'activation.createCredentials', 'activation.enrollMFA', 'activation.verifyMFA',
  'activation.registerDevice', 'activation.complete',
  'activation.createTermsVersion',
  // Loans
  'loans.makePayment',
  // Standing Instructions
  'standingInstructions.create', 'standingInstructions.update',
  // Notifications
  'notifications.markRead', 'notifications.markAllRead',
]);

/**
 * Convert action name to GraphQL field name.
 * "accounts.list" → "accountsList"
 * "cms.content.create" → "cmsContentCreate"
 * "external-accounts.list" → "externalAccountsList"
 */
function actionToFieldName(action: string): string {
  return action
    .split(/[._-]/)
    .map((part, i) => i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Reverse mapping: field name → action */
const fieldToAction = new Map<string, string>();
for (const action of Object.keys(routes)) {
  fieldToAction.set(actionToFieldName(action), action);
}

// =============================================================================
// SCHEMA GENERATION (SDL)
// =============================================================================

/**
 * Generate a GraphQL SDL schema from the route map.
 * All query/mutation fields accept a JSON `params` argument and return JSON.
 */
export function generateSchema(): string {
  const queries: string[] = [];
  const mutations: string[] = [];

  const sortedActions = Object.keys(routes).sort();

  for (const action of sortedActions) {
    const fieldName = actionToFieldName(action);
    const description = `  """Gateway action: ${action}"""`;
    const field = `${description}\n  ${fieldName}(params: JSON): JSON`;

    if (MUTATION_ACTIONS.has(action)) {
      mutations.push(field);
    } else {
      queries.push(field);
    }
  }

  return `"""
Custom scalar for arbitrary JSON data.
Gateway actions accept and return JSON objects.
"""
scalar JSON

type Query {
${queries.join('\n\n')}
}

type Mutation {
${mutations.join('\n\n')}
}
`;
}

// =============================================================================
// QUERY PARSER (Lightweight)
// =============================================================================

/**
 * Lightweight GraphQL query parser.
 * Handles the subset of GraphQL we need: simple field selections with arguments.
 * Does NOT handle fragments, directives, inline types, or nested selections
 * (since our resolvers return opaque JSON).
 */
function parseGraphQL(query: string, variables?: Record<string, unknown>): ParsedOperation {
  // Strip comments
  const cleaned = query.replace(/#[^\n]*/g, '').trim();

  // Detect operation type
  let type: 'query' | 'mutation' = 'query';
  if (cleaned.startsWith('mutation')) {
    type = 'mutation';
  }

  // Extract the body between outermost { }
  const bodyMatch = cleaned.match(/\{([\s\S]*)\}/);
  if (!bodyMatch) {
    throw new GraphQLParseError('Invalid GraphQL: no selection set found');
  }

  const body = bodyMatch[1].trim();
  const selections = parseSelections(body, variables ?? {});

  return { type, selections };
}

function parseSelections(body: string, variables: Record<string, unknown>): ParsedSelection[] {
  const selections: ParsedSelection[] = [];
  let pos = 0;

  while (pos < body.length) {
    // Skip whitespace
    while (pos < body.length && /\s/.test(body[pos])) pos++;
    if (pos >= body.length) break;

    // Skip nested selection sets (we don't resolve sub-fields)
    if (body[pos] === '{') {
      let depth = 1;
      pos++;
      while (pos < body.length && depth > 0) {
        if (body[pos] === '{') depth++;
        if (body[pos] === '}') depth--;
        pos++;
      }
      continue;
    }

    // Parse field name (with optional alias)
    const fieldMatch = body.slice(pos).match(/^(\w+)\s*(?::\s*(\w+))?\s*/);
    if (!fieldMatch) {
      pos++;
      continue;
    }

    let alias: string | undefined;
    let fieldName: string;

    if (fieldMatch[2]) {
      alias = fieldMatch[1];
      fieldName = fieldMatch[2];
      pos += fieldMatch[0].length;
    } else {
      fieldName = fieldMatch[1];
      pos += fieldMatch[0].length;
    }

    // Parse arguments if present
    let args: Record<string, unknown> = {};
    if (pos < body.length && body[pos] === '(') {
      const argsResult = parseArguments(body, pos, variables);
      args = argsResult.args;
      pos = argsResult.endPos;
    }

    // Skip any trailing selection set (we return opaque JSON)
    while (pos < body.length && /\s/.test(body[pos])) pos++;
    if (pos < body.length && body[pos] === '{') {
      let depth = 1;
      pos++;
      while (pos < body.length && depth > 0) {
        if (body[pos] === '{') depth++;
        if (body[pos] === '}') depth--;
        pos++;
      }
    }

    selections.push({ fieldName, alias, arguments: args });
  }

  return selections;
}

function parseArguments(
  body: string,
  startPos: number,
  variables: Record<string, unknown>,
): { args: Record<string, unknown>; endPos: number } {
  // Find matching closing paren
  let depth = 0;
  let pos = startPos;
  while (pos < body.length) {
    if (body[pos] === '(') depth++;
    if (body[pos] === ')') { depth--; if (depth === 0) break; }
    pos++;
  }

  const argsStr = body.slice(startPos + 1, pos).trim();
  pos++; // skip closing paren

  const args: Record<string, unknown> = {};

  // Match key: value pairs
  const argRegex = /(\w+)\s*:\s*/g;
  let match;
  while ((match = argRegex.exec(argsStr)) !== null) {
    const key = match[1];
    const valueStart = match.index + match[0].length;
    const value = parseValue(argsStr, valueStart, variables);
    args[key] = value.value;
    argRegex.lastIndex = value.endPos;
  }

  return { args, endPos: pos };
}

function parseValue(
  str: string,
  pos: number,
  variables: Record<string, unknown>,
): { value: unknown; endPos: number } {
  // Skip whitespace
  while (pos < str.length && /\s/.test(str[pos])) pos++;

  // Variable reference
  if (str[pos] === '$') {
    const nameMatch = str.slice(pos + 1).match(/^(\w+)/);
    if (nameMatch) {
      const varName = nameMatch[1];
      return { value: variables[varName], endPos: pos + 1 + varName.length };
    }
  }

  // String literal
  if (str[pos] === '"') {
    let end = pos + 1;
    while (end < str.length && str[end] !== '"') {
      if (str[end] === '\\') end++; // skip escaped chars
      end++;
    }
    const value = str.slice(pos + 1, end).replace(/\\"/g, '"');
    return { value, endPos: end + 1 };
  }

  // Number
  const numMatch = str.slice(pos).match(/^-?\d+(\.\d+)?/);
  if (numMatch) {
    return {
      value: numMatch[0].includes('.') ? parseFloat(numMatch[0]) : parseInt(numMatch[0], 10),
      endPos: pos + numMatch[0].length,
    };
  }

  // Boolean / null
  if (str.slice(pos, pos + 4) === 'true') return { value: true, endPos: pos + 4 };
  if (str.slice(pos, pos + 5) === 'false') return { value: false, endPos: pos + 5 };
  if (str.slice(pos, pos + 4) === 'null') return { value: null, endPos: pos + 4 };

  // Object (JSON-like)
  if (str[pos] === '{') {
    let depth = 1;
    let end = pos + 1;
    while (end < str.length && depth > 0) {
      if (str[end] === '{') depth++;
      if (str[end] === '}') depth--;
      end++;
    }
    try {
      const value = JSON.parse(str.slice(pos, end));
      return { value, endPos: end };
    } catch {
      return { value: null, endPos: end };
    }
  }

  // Array
  if (str[pos] === '[') {
    let depth = 1;
    let end = pos + 1;
    while (end < str.length && depth > 0) {
      if (str[end] === '[') depth++;
      if (str[end] === ']') depth--;
      end++;
    }
    try {
      const value = JSON.parse(str.slice(pos, end));
      return { value, endPos: end };
    } catch {
      return { value: [], endPos: end };
    }
  }

  // Enum value (unquoted string)
  const enumMatch = str.slice(pos).match(/^(\w+)/);
  if (enumMatch) {
    return { value: enumMatch[1], endPos: pos + enumMatch[1].length };
  }

  return { value: null, endPos: pos + 1 };
}

class GraphQLParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphQLParseError';
  }
}

// =============================================================================
// INTROSPECTION
// =============================================================================

/**
 * Handle introspection queries (__schema, __type).
 * Returns a simplified introspection result.
 */
function handleIntrospection(): GraphQLResponse {
  const queryFields: { name: string; action: string }[] = [];
  const mutationFields: { name: string; action: string }[] = [];

  for (const action of Object.keys(routes).sort()) {
    const field = { name: actionToFieldName(action), action };
    if (MUTATION_ACTIONS.has(action)) {
      mutationFields.push(field);
    } else {
      queryFields.push(field);
    }
  }

  return {
    data: {
      __schema: {
        queryType: { name: 'Query' },
        mutationType: { name: 'Mutation' },
        types: [
          {
            kind: 'OBJECT',
            name: 'Query',
            fields: queryFields.map(f => ({
              name: f.name,
              description: `Gateway action: ${f.action}`,
              args: [{ name: 'params', type: { kind: 'SCALAR', name: 'JSON' } }],
              type: { kind: 'SCALAR', name: 'JSON' },
            })),
          },
          {
            kind: 'OBJECT',
            name: 'Mutation',
            fields: mutationFields.map(f => ({
              name: f.name,
              description: `Gateway action: ${f.action}`,
              args: [{ name: 'params', type: { kind: 'SCALAR', name: 'JSON' } }],
              type: { kind: 'SCALAR', name: 'JSON' },
            })),
          },
        ],
      },
    },
  };
}

// =============================================================================
// EXECUTOR
// =============================================================================

/**
 * Execute a GraphQL request against the gateway handlers.
 *
 * Each field in the query/mutation maps to a gateway action.
 * The `params` argument is passed directly to the handler.
 * Multiple fields are executed in parallel.
 */
export async function executeGraphQL(
  gqlRequest: GraphQLRequest,
  ctx: GatewayContext,
): Promise<GraphQLResponse> {
  const { query, variables, operationName: _operationName } = gqlRequest;

  // Handle introspection
  if (query.includes('__schema') || query.includes('__type')) {
    return handleIntrospection();
  }

  // Parse
  let operation: ParsedOperation;
  try {
    operation = parseGraphQL(query, variables);
  } catch (err) {
    return {
      data: null,
      errors: [{
        message: err instanceof Error ? err.message : 'Failed to parse GraphQL query',
      }],
    };
  }

  if (operation.selections.length === 0) {
    return { data: null, errors: [{ message: 'No fields selected' }] };
  }

  // Resolve each selection to a gateway action
  const results: Record<string, unknown> = {};
  const errors: GraphQLError[] = [];

  const executions = operation.selections.map(async (selection) => {
    const resultKey = selection.alias ?? selection.fieldName;
    const action = fieldToAction.get(selection.fieldName);

    if (!action) {
      errors.push({
        message: `Unknown field: ${selection.fieldName}`,
        path: [resultKey],
      });
      results[resultKey] = null;
      return;
    }

    // Verify query vs mutation
    const isMutation = MUTATION_ACTIONS.has(action);
    if (operation.type === 'query' && isMutation) {
      errors.push({
        message: `"${selection.fieldName}" is a mutation, not a query`,
        path: [resultKey],
      });
      results[resultKey] = null;
      return;
    }

    // Execute handler
    const handler: Handler = routes[action];
    const handlerCtx: GatewayContext = {
      ...ctx,
      params: (selection.arguments.params as Record<string, unknown>) ?? selection.arguments ?? {},
    };

    try {
      const response = await handler(handlerCtx);
      if (response.error) {
        errors.push({
          message: response.error.message,
          path: [resultKey],
          extensions: { code: response.error.code },
        });
        results[resultKey] = null;
      } else {
        results[resultKey] = response.data;
      }
    } catch (err) {
      errors.push({
        message: err instanceof Error ? err.message : 'Internal error',
        path: [resultKey],
      });
      results[resultKey] = null;
    }
  });

  await Promise.all(executions);

  return {
    data: results,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Check if a request is a GraphQL request.
 * GraphQL requests have Content-Type: application/graphql
 * or a body with a "query" field.
 */
export function isGraphQLRequest(req: Request, body: Record<string, unknown>): boolean {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/graphql')) return true;
  if ('query' in body && typeof body.query === 'string' && !('action' in body)) return true;
  return false;
}

/**
 * Handle a GET request for the GraphQL schema (SDL).
 */
export function handleSchemaRequest(req: Request): Response | null {
  const url = new URL(req.url);
  if (req.method === 'GET' && url.searchParams.has('graphql')) {
    return new Response(generateSchema(), {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return null;
}

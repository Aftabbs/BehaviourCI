import axios from 'axios';
import { JSONPath } from 'jsonpath-plus';
import type { EndpointTarget } from '../types/spec.js';

/** Substitute {{input}} placeholder and any $ENV_VAR references in a string */
function interpolate(template: string, input: string): string {
  // Replace {{input}} with the test input
  let result = template.replace(/\{\{input\}\}/g, input);
  // Replace $ENV_VAR or ${ENV_VAR} references
  result = result.replace(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g, (_, varName) => {
    return process.env[varName] ?? _;
  });
  return result;
}

/** Extract a string value from a JSON response using JSONPath */
function extractResponse(data: unknown, responsePath: string): string {
  if (responsePath === '$' || !responsePath) {
    return typeof data === 'string' ? data : JSON.stringify(data);
  }

  const results = JSONPath({ path: responsePath, json: data as object });
  if (!results || results.length === 0) {
    throw new Error(
      `response_path "${responsePath}" matched nothing in response: ${JSON.stringify(data)}`
    );
  }

  const value = results[0];
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * Call a deployed AI endpoint with a test input and return the response text.
 */
export async function callEndpoint(config: EndpointTarget, input: string): Promise<string> {
  const url = interpolate(config.url, input);
  const method = (config.method ?? 'POST').toLowerCase();
  const timeout = config.timeout_ms ?? 10000;

  // Interpolate headers (supports $ENV_VAR in header values)
  const headers: Record<string, string> = {};
  if (config.headers) {
    for (const [key, val] of Object.entries(config.headers)) {
      headers[key] = interpolate(val, input);
    }
  }

  // Build request body
  let body: string | undefined;
  if (config.body_template) {
    body = interpolate(config.body_template, input);
  } else if (method === 'post' || method === 'put' || method === 'patch') {
    body = JSON.stringify({ input });
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  const response = await axios({
    method,
    url,
    headers,
    data: body,
    timeout,
    validateStatus: () => true, // don't throw on non-2xx
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Endpoint returned HTTP ${response.status}: ${JSON.stringify(response.data)}`
    );
  }

  return extractResponse(response.data, config.response_path ?? '$');
}

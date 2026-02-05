import { ToolDefinition, ToolContext } from '@atlas/core';
import axios, { Method } from 'axios';
import autocannon from 'autocannon';

export const httpRequestConfig: ToolDefinition = {
    name: 'http_request',
    description: 'Make an HTTP request (GET, POST, PUT, DELETE, etc.) to an API endpoint. Use this for testing APIs, checking server status, or fetching data.',
    parameters: {
        type: 'object',
        properties: {
            url: {
                type: 'string',
                description: 'The full URL to make the request to',
            },
            method: {
                type: 'string',
                description: 'HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS). Defaults to GET.',
                enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
            },
            headers: {
                type: 'object',
                description: 'HTTP headers to include in the request',
            },
            data: {
                type: 'object',
                description: 'JSON body data to send with the request (for POST/PUT/PATCH)',
            },
            timeout: {
                type: 'number',
                description: 'Request timeout in milliseconds (default: 5000)',
            },
            validateStatus: {
                type: 'boolean',
                description: 'If true, throws error on non-2xx status. If false, returns response regardless of status. Default: false (so you can inspect error codes).',
            }
        },
        required: ['url'],
    },
    handler: async (args: any, context: ToolContext) => {
        const { url, method = 'GET', headers = {}, data, timeout = 10000, validateStatus = false } = args;

        try {
            const startTime = Date.now();
            const response = await axios({
                url,
                method: method as Method,
                headers,
                data,
                timeout,
                validateStatus: () => true, // Always resolve, don't throw on status codes unless strictly requested
            });
            const duration = Date.now() - startTime;

            if (validateStatus && (response.status < 200 || response.status >= 300)) {
                throw new Error(`HTTP Request failed with status ${response.status} ${response.statusText}`);
            }

            return {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data,
                durationMs: duration,
                config: {
                    url,
                    method,
                }
            };
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                return {
                    error: error.message,
                    code: error.code,
                    response: error.response ? {
                        status: error.response.status,
                        statusText: error.response.statusText,
                        data: error.response.data
                    } : null
                };
            }
            throw error;
        }
    },
};

export const runLoadTestConfig: ToolDefinition = {
    name: 'run_load_test',
    description: 'Run a performance load test against an HTTP endpoint using autocannon. EXPERIMENTAL: Use with caution on production systems.',
    parameters: {
        type: 'object',
        properties: {
            url: {
                type: 'string',
                description: 'The target URL to test',
            },
            connections: {
                type: 'number',
                description: 'Number of concurrent connections (default: 10)',
            },
            duration: {
                type: 'number',
                description: 'Duration of the test in seconds (default: 10)',
            },
            method: {
                type: 'string',
                description: 'HTTP method (GET, POST, etc.)',
            },
            body: {
                type: 'string',
                description: 'Request body (stringified JSON)',
            },
            headers: {
                type: 'object',
                description: 'HTTP headers',
            },
        },
        required: ['url'],
    },
    handler: async (args: any, context: ToolContext) => {
        const { url, connections = 10, duration = 10, method = 'GET', body, headers } = args;

        return new Promise((resolve, reject) => {
            const instance = autocannon({
                url,
                connections,
                duration,
                method,
                body,
                headers,
            }, (err: any, result: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        url: result.url,
                        requests: {
                            total: result.requests.total,
                            average: result.requests.average,
                            p99: result.latency.p99,
                        },
                        latency: {
                            average: result.latency.average,
                            p99: result.latency.p99,
                            max: result.latency.max,
                        },
                        throughput: {
                            average: result.throughput.average,
                            p99: result.throughput.p99,
                        },
                        errors: result.errors,
                        timeouts: result.timeouts,
                        duration: result.duration
                    });
                }
            });

            process.once('SIGINT', () => {
                instance.stop();
            });
        });
    },
};

export const apiTools: ToolDefinition[] = [httpRequestConfig, runLoadTestConfig];


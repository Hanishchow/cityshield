import { z } from 'zod';
import { createIncidentSchema, pingSchema } from './domain/incident.ts';

/**
 * Produce a machine-readable API contract that clients can use for codegen,
 * mock servers, or interactive documentation without human guessing at the
 * route signatures.
 */

const idPattern = '^CS-[0-9A-Z]{3}-[0-9A-Z]{3}$';
const idExample = 'CS-GN4-9YX';

/* Schemas derived from the runtime validators so they cannot drift. */
const createIncidentJsonSchema = z.toJSONSchema(createIncidentSchema, {
  target: 'draft-2020-12',
});
const pingJsonSchema = z.toJSONSchema(pingSchema, {
  target: 'draft-2020-12',
});

const IncidentSchema = {
  type: 'object',
  required: [
    'id',
    'state',
    'category',
    'severity',
    'sos',
    'createdAt',
    'updatedAt',
    'pings',
    'tasks',
    'timeline',
  ],
  properties: {
    id: { type: 'string', pattern: idPattern, example: idExample },
    state: {
      type: 'string',
      enum: [
        'draft',
        'submitted',
        'acknowledged',
        'responding',
        'on_scene',
        'resolved',
        'cancelled',
      ],
    },
    category: {
      type: 'string',
      enum: [
        'medical',
        'fire',
        'police',
        'accident',
        'civic',
        'disaster',
        'unknown',
      ],
    },
    severity: {
      type: 'string',
      enum: ['critical', 'urgent', 'standard'],
    },
    description: { type: ['string', 'null'] },
    sos: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    pings: {
      type: 'array',
      items: {
        ...pingJsonSchema,
        required: [...(pingJsonSchema.required ?? []), 'at'],
        properties: {
          ...pingJsonSchema.properties,
          at: { type: 'string', format: 'date-time' },
        },
      },
    },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'agency',
          'role',
          'state',
          'unit',
          'updatedAt',
          'simulated',
        ],
        properties: {
          agency: { type: 'string' },
          role: { type: 'string', enum: ['primary', 'secondary'] },
          state: {
            type: 'string',
            enum: [
              'notified',
              'accepted',
              'declined',
              'en_route',
              'on_scene',
              'cleared',
            ],
          },
          unit: { type: ['string', 'null'] },
          updatedAt: { type: 'string', format: 'date-time' },
          simulated: { type: 'boolean' },
        },
      },
    },
    timeline: {
      type: 'array',
      items: {
        type: 'object',
        required: ['state', 'at'],
        properties: {
          state: {
            type: 'string',
            enum: [
              'draft',
              'submitted',
              'acknowledged',
              'responding',
              'on_scene',
              'resolved',
              'cancelled',
            ],
          },
          at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
} as const;

const StateTransitionBody = {
  type: 'object',
  required: ['to'],
  properties: {
    to: {
      type: 'string',
      enum: [
        'draft',
        'submitted',
        'acknowledged',
        'responding',
        'on_scene',
        'resolved',
        'cancelled',
      ],
    },
  },
} as const;

const ValidationError = {
  type: 'object',
  required: ['error', 'issues'],
  properties: {
    error: { type: 'string', example: 'Invalid request' },
    issues: {
      type: 'array',
      items: { type: 'object' },
    },
  },
} as const;

const NotFoundError = {
  type: 'object',
  required: ['error'],
  properties: {
    error: { type: 'string', example: 'Incident not found' },
  },
} as const;

const ConflictError = {
  type: 'object',
  required: ['error'],
  properties: {
    error: { type: 'string' },
  },
} as const;

const HealthResponse = {
  type: 'object',
  required: ['ok', 'env', 'store', 'openStreams', 'uptimeSeconds'],
  properties: {
    ok: { type: 'boolean', example: true },
    env: { type: 'string', example: 'development' },
    capabilities: { type: 'object' },
    store: { type: 'string', example: 'memory' },
    openStreams: { type: 'number', example: 0 },
    uptimeSeconds: { type: 'number', example: 120 },
  },
} as const;

const GeocodeResponse = {
  type: 'object',
  required: ['place', 'providers', 'degraded'],
  properties: {
    place: { type: 'object' },
    providers: {
      type: 'array',
      items: { type: 'string' },
    },
    degraded: { type: 'boolean' },
  },
} as const;

const PingAccepted = {
  type: 'object',
  required: ['ok', 'pings'],
  properties: {
    ok: { type: 'boolean', example: true },
    pings: { type: 'number', example: 3 },
  },
} as const;

export function buildOpenApiDocument(): object {
  return {
    openapi: '3.1.0',
    info: {
      title: 'City Shield Emergency Response API',
      version: '0.1.0',
      description:
        'Single-record emergency coordination API. One incident, every agency.',
    },
    servers: [{ url: '/', description: 'Current host' }],
    paths: {
      '/health': {
        get: {
          operationId: 'getHealth',
          summary: 'Liveness and configuration probe',
          tags: ['ops'],
          responses: {
            '200': {
              description: 'Service is up',
              content: {
                'application/json': {
                  schema: HealthResponse,
                },
              },
            },
          },
        },
      },
      '/v1/incidents': {
        post: {
          operationId: 'createIncident',
          summary: 'Raise a new incident',
          description:
            'The endpoint behind the SOS control. Routing happens server-side: the citizen never chooses which agency owns their emergency.',
          tags: ['incidents'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: createIncidentJsonSchema,
              },
            },
          },
          responses: {
            '201': {
              description: 'Incident created and routed',
              content: {
                'application/json': {
                  schema: IncidentSchema,
                },
              },
            },
            '400': {
              description: 'Validation failed',
              content: {
                'application/json': {
                  schema: ValidationError,
                },
              },
            },
          },
        },
      },
      '/v1/incidents/{id}': {
        get: {
          operationId: 'getIncident',
          summary: 'Fetch a single incident by ID',
          tags: ['incidents'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', pattern: idPattern },
              example: idExample,
            },
          ],
          responses: {
            '200': {
              description: 'Incident found',
              content: {
                'application/json': {
                  schema: IncidentSchema,
                },
              },
            },
            '404': {
              description: 'Incident does not exist',
              content: {
                'application/json': {
                  schema: NotFoundError,
                },
              },
            },
          },
        },
      },
      '/v1/incidents/{id}/state': {
        patch: {
          operationId: 'transitionIncidentState',
          summary: 'Propose a state transition',
          description:
            'The server decides whether the transition is legal. An emergency record must never go backwards from resolved or skip acknowledged.',
          tags: ['incidents'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', pattern: idPattern },
              example: idExample,
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: StateTransitionBody,
              },
            },
          },
          responses: {
            '200': {
              description: 'Transition accepted',
              content: {
                'application/json': {
                  schema: IncidentSchema,
                },
              },
            },
            '400': {
              description: 'Validation failed',
              content: {
                'application/json': {
                  schema: ValidationError,
                },
              },
            },
            '409': {
              description: 'Illegal state transition',
              content: {
                'application/json': {
                  schema: ConflictError,
                },
              },
            },
          },
        },
      },
      '/v1/incidents/{id}/pings': {
        post: {
          operationId: 'addPing',
          summary: 'Append a location fix',
          description:
            'The most sensitive write this service accepts. A fix without its uncertainty is a fix that lies.',
          tags: ['incidents'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', pattern: idPattern },
              example: idExample,
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: pingJsonSchema,
              },
            },
          },
          responses: {
            '202': {
              description: 'Ping accepted',
              content: {
                'application/json': {
                  schema: PingAccepted,
                },
              },
            },
            '400': {
              description: 'Validation failed',
              content: {
                'application/json': {
                  schema: ValidationError,
                },
              },
            },
          },
        },
      },
      '/v1/incidents/{id}/stream': {
        get: {
          operationId: 'streamIncident',
          summary: 'Server-Sent Events stream for an incident',
          description:
            'Emits "incident" events carrying the full Incident object as JSON. A colon-prefixed keep-alive comment is sent every 25 seconds to prevent idle connection reaping by intermediaries. SSE was chosen over WebSockets because EventSource reconnects automatically after a dropped mobile connection and survives corporate proxies that break WS upgrades.',
          tags: ['stream'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', pattern: idPattern },
              example: idExample,
            },
          ],
          responses: {
            '200': {
              description:
                'Event stream. First frame is the current state; subsequent frames are emitted on every state change or new ping.',
              content: {
                'text/event-stream': {
                  schema: {
                    type: 'string',
                    description:
                      'SSE frames. Each "incident" event carries a JSON-encoded Incident. Keep-alive comments appear as ": keep-alive\\n\\n" every 25s.',
                  },
                },
              },
            },
            '404': {
              description: 'Incident does not exist',
              content: {
                'application/json': {
                  schema: NotFoundError,
                },
              },
            },
          },
        },
      },
      '/v1/geo/reverse': {
        get: {
          operationId: 'reverseGeocode',
          summary: 'Reverse geocode coordinates to a place name',
          description:
            'Server-side geocode proxy. The map credentials stay on the server: the previous client-side call shipped the key to every visitor in plaintext because every VITE_* variable is inlined into the bundle at build time.',
          tags: ['geo'],
          parameters: [
            {
              name: 'lat',
              in: 'query',
              required: true,
              schema: { type: 'number', minimum: -90, maximum: 90 },
            },
            {
              name: 'lng',
              in: 'query',
              required: true,
              schema: { type: 'number', minimum: -180, maximum: 180 },
            },
          ],
          responses: {
            '200': {
              description: 'Geocode result',
              headers: {
                'cache-control': {
                  schema: { type: 'string' },
                  description:
                    'Private, 60s max-age. Coordinates change slowly relative to how often a moving client asks.',
                },
              },
              content: {
                'application/json': {
                  schema: GeocodeResponse,
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Incident: IncidentSchema,
        CreateIncidentBody: createIncidentJsonSchema,
        PingBody: pingJsonSchema,
      },
    },
  };
}

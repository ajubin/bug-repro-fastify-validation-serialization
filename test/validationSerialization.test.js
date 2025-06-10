const Fastify = require('fastify');
const Ajv = require('ajv');
const fastJson = require('fast-json-stringify');

describe('fastify validation/serialization bug reproduction', () => {
  const schema = {
    type: 'object',
    properties: {
      aNonNullabledProperty: {
        type: 'string',
        nullable: false,
      },
    },
    required: ['aNonNullabledProperty'],
  };

  test('ajv validate and fast-json-stringify individually', () => {
    const ajv = new Ajv({ strict: true, strictTypes: true });
    const validate = ajv.compile(schema);
    const stringify = fastJson(schema);

    const data = { aNonNullabledProperty: 'hello' };

    expect(validate(data)).toBe(true);
    expect(stringify(data)).toBe('{"aNonNullabledProperty":"hello"}');
  });

  test('fastify integration validate then serialize', async () => {
    const app = Fastify({ logger: false });

    const ajv = new Ajv({
      coerceTypes: 'array',
      useDefaults: true,
      removeAdditional: true,
      allErrors: false,
      allowUnionTypes: true,
      strictTypes: true,
      strict: true,
    });

    app.setValidatorCompiler(({ schema }) => ajv.compile(schema));
    app.setSerializerCompiler(({ schema }) => fastJson(schema));

    app.post('/', {
      schema: {
        body: schema,
        response: { 200: schema },
      },
    }, async (request, reply) => {
      return request.body;
    });

    const res = await app.inject({ method: 'POST', url: '/', payload: { aNonNullabledProperty: 'hello' } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('{"aNonNullabledProperty":"hello"}');
    await app.close();
  });
});

const request = require('supertest');
const app = require('../src/app');
const pedidoService = require('../src/services/pedidoService');

const pedidoValido = {
  cliente: 'Carlos Silva',
  tipo: 'entrega',
  valor: 350,
  prioridade: 'normal',
};

beforeEach(() => {
  pedidoService.resetar();
});

describe('POST /pedidos', () => {
  test('cria pedido válido com 201 e status "recebido"', async () => {
    const res = await request(app).post('/pedidos').send(pedidoValido);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, ...pedidoValido, status: 'recebido' });
  });

  test('remove espaços nas extremidades do cliente', async () => {
    const res = await request(app).post('/pedidos').send({ ...pedidoValido, cliente: '  Ana  ' });
    expect(res.status).toBe(201);
    expect(res.body.cliente).toBe('Ana');
  });

  test.each([
    ['cliente ausente', { cliente: undefined }],
    ['cliente vazio', { cliente: '' }],
    ['cliente só com espaços', { cliente: '   ' }],
    ['cliente não é texto', { cliente: 123 }],
    ['valor zero', { valor: 0 }],
    ['valor negativo', { valor: -10 }],
    ['valor em texto', { valor: '350' }],
    ['valor ausente', { valor: undefined }],
    ['tipo desconhecido', { tipo: 'voador' }],
    ['prioridade desconhecida', { prioridade: 'urgentissima' }],
  ])('retorna 400 quando %s', async (_nome, alteracao) => {
    const res = await request(app).post('/pedidos').send({ ...pedidoValido, ...alteracao });
    expect(res.status).toBe(400);
    expect(res.body.erro).toEqual(expect.any(String));
  });

  test('retorna 400 para JSON malformado', async () => {
    const res = await request(app)
      .post('/pedidos')
      .set('Content-Type', 'application/json')
      .send('{"cliente": ');
    expect(res.status).toBe(400);
  });

  test('retorna 400 quando o corpo está ausente', async () => {
    const res = await request(app).post('/pedidos');
    expect(res.status).toBe(400);
  });
});

describe('GET /pedidos', () => {
  test('retorna lista vazia inicialmente', async () => {
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('retorna os pedidos cadastrados', async () => {
    await request(app).post('/pedidos').send(pedidoValido);
    await request(app).post('/pedidos').send({ ...pedidoValido, cliente: 'Maria' });
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[1].id).toBe(2);
  });
});

describe('GET /pedidos/:id', () => {
  test('retorna pedido existente com 200', async () => {
    await request(app).post('/pedidos').send(pedidoValido);
    const res = await request(app).get('/pedidos/1');
    expect(res.status).toBe(200);
    expect(res.body.cliente).toBe('Carlos Silva');
  });

  test('retorna 404 para id inexistente', async () => {
    const res = await request(app).get('/pedidos/999');
    expect(res.status).toBe(404);
    expect(res.body.erro).toEqual(expect.any(String));
  });

  test('retorna 400 para id não numérico', async () => {
    const res = await request(app).get('/pedidos/abc');
    expect(res.status).toBe(400);
  });
});

describe('PATCH /pedidos/:id/status', () => {
  beforeEach(async () => {
    await request(app).post('/pedidos').send(pedidoValido);
  });

  test('atualiza status com transição válida', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'em_preparacao' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('em_preparacao');
  });

  test('percorre o fluxo completo até entregue', async () => {
    for (const status of ['em_preparacao', 'enviado', 'entregue']) {
      const res = await request(app).patch('/pedidos/1/status').send({ status });
      expect(res.status).toBe(200);
    }
    const final = await request(app).get('/pedidos/1');
    expect(final.body.status).toBe('entregue');
  });

  test('permite cancelar um pedido recebido', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'cancelado' });
    expect(res.status).toBe(200);
  });

  test('retorna 400 para status desconhecido', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'voando' });
    expect(res.status).toBe(400);
  });

  test('retorna 400 quando status está ausente', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({});
    expect(res.status).toBe(400);
  });

  test('retorna 400 para transição inválida (recebido -> entregue)', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'entregue' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/Transição inválida/);
  });

  test('retorna 400 ao alterar pedido já cancelado', async () => {
    await request(app).patch('/pedidos/1/status').send({ status: 'cancelado' });
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'em_preparacao' });
    expect(res.status).toBe(400);
  });

  test('não permite cancelar pedido já enviado', async () => {
    await request(app).patch('/pedidos/1/status').send({ status: 'em_preparacao' });
    await request(app).patch('/pedidos/1/status').send({ status: 'enviado' });
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'cancelado' });
    expect(res.status).toBe(400);
  });

  test('retorna 404 para id inexistente', async () => {
    const res = await request(app).patch('/pedidos/999/status').send({ status: 'cancelado' });
    expect(res.status).toBe(404);
  });
});

describe('Erros gerais', () => {
  test('rota inexistente retorna 404 em JSON', async () => {
    const res = await request(app).get('/qualquer-coisa');
    expect(res.status).toBe(404);
    expect(res.body.erro).toEqual(expect.any(String));
  });

  test('erro inesperado retorna 500 e não é tratado como validação', async () => {
    const spy = jest.spyOn(pedidoService, 'listar').mockImplementation(() => {
      throw new Error('falha interna');
    });
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(500);
    expect(res.body.erro).toBe('Erro interno do servidor.');
    spy.mockRestore();
    logSpy.mockRestore();
  });
});

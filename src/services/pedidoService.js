// Camada de serviço: regras de negócio, validações e armazenamento em memória.
const { ValidationError, NotFoundError } = require('../errors/AppError');

const TIPOS = ['entrega', 'retirada'];
const PRIORIDADES = ['baixa', 'normal', 'alta', 'urgente'];
const STATUS = ['recebido', 'em_preparacao', 'enviado', 'entregue', 'cancelado'];

// Transições permitidas: status atual -> próximos status possíveis.
const TRANSICOES = {
  recebido: ['em_preparacao', 'cancelado'],
  em_preparacao: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: [],
};

let pedidos = [];
let proximoId = 1;

function resetar() {
  pedidos = [];
  proximoId = 1;
}

function validarNovoPedido(dados) {
  if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ValidationError('O corpo da requisição deve ser um objeto JSON.');
  }

  const { cliente, tipo, valor, prioridade } = dados;

  if (typeof cliente !== 'string' || cliente.trim() === '') {
    throw new ValidationError('O campo "cliente" é obrigatório e deve ser um texto não vazio.');
  }

  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    throw new ValidationError('O campo "valor" deve ser um número maior que zero.');
  }

  if (!TIPOS.includes(tipo)) {
    throw new ValidationError(`O campo "tipo" é inválido. Valores aceitos: ${TIPOS.join(', ')}.`);
  }

  if (!PRIORIDADES.includes(prioridade)) {
    throw new ValidationError(
      `O campo "prioridade" é inválido. Valores aceitos: ${PRIORIDADES.join(', ')}.`
    );
  }

  return { cliente: cliente.trim(), tipo, valor, prioridade };
}

function criar(dados) {
  const validado = validarNovoPedido(dados);
  const pedido = { id: proximoId++, ...validado, status: 'recebido' };
  pedidos.push(pedido);
  return pedido;
}

function listar() {
  return pedidos;
}

function buscarPorId(id) {
  const pedido = pedidos.find((p) => p.id === id);
  if (!pedido) {
    throw new NotFoundError(`Pedido com id ${id} não encontrado.`);
  }
  return pedido;
}

function atualizarStatus(id, dados) {
  const pedido = buscarPorId(id); // 404 se não existir

  if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ValidationError('O corpo da requisição deve ser um objeto JSON.');
  }

  const { status } = dados;

  if (!STATUS.includes(status)) {
    throw new ValidationError(`O campo "status" é inválido. Valores aceitos: ${STATUS.join(', ')}.`);
  }

  if (!TRANSICOES[pedido.status].includes(status)) {
    const permitidos = TRANSICOES[pedido.status];
    const detalhe = permitidos.length
      ? `Transições permitidas: ${permitidos.join(', ')}.`
      : 'Este pedido está em um estado final.';
    throw new ValidationError(
      `Transição inválida de "${pedido.status}" para "${status}". ${detalhe}`
    );
  }

  pedido.status = status;
  return pedido;
}

module.exports = {
  TIPOS,
  PRIORIDADES,
  STATUS,
  TRANSICOES,
  criar,
  listar,
  buscarPorId,
  atualizarStatus,
  resetar,
};

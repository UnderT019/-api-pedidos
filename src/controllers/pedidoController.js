// Camada de controller: lê a requisição, chama o service e devolve a resposta HTTP.
const pedidoService = require('../services/pedidoService');
const { ValidationError } = require('../errors/AppError');

// Converte o :id da URL em número inteiro positivo; caso contrário, 400.
function lerId(req) {
  const texto = req.params.id;
  if (!/^\d+$/.test(texto) || Number(texto) < 1) {
    throw new ValidationError('O identificador deve ser um número inteiro positivo.');
  }
  return Number(texto);
}

function criar(req, res) {
  const pedido = pedidoService.criar(req.body);
  res.status(201).json(pedido);
}

function listar(req, res) {
  res.status(200).json(pedidoService.listar());
}

function buscarPorId(req, res) {
  const pedido = pedidoService.buscarPorId(lerId(req));
  res.status(200).json(pedido);
}

function atualizarStatus(req, res) {
  const pedido = pedidoService.atualizarStatus(lerId(req), req.body);
  res.status(200).json(pedido);
}

module.exports = { criar, listar, buscarPorId, atualizarStatus };

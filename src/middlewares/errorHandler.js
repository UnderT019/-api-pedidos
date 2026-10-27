const { AppError } = require('../errors/AppError');

// Rota inexistente -> 404 em JSON
function naoEncontrado(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

// Tratamento central de erros.
// - AppError (400/404): mensagem explicativa para o usuário.
// - JSON malformado (erro do body-parser): 400.
// - Qualquer outra coisa: 500 genérico, sem vazar detalhes internos.
// eslint-disable-next-line no-unused-vars
function tratarErros(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ erro: err.message });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON malformado no corpo da requisição.' });
  }

  console.error(err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = { naoEncontrado, tratarErros };

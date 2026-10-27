// Camada de rotas: associa método + URL a um controller.
const { Router } = require('express');
const controller = require('../controllers/pedidoController');

const router = Router();

router.post('/', controller.criar);
router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.patch('/:id/status', controller.atualizarStatus);

module.exports = router;

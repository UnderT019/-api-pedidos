# API de Gerenciamento de Pedidos

Projeto prático avaliativo — Tópicos Avançados em Sistemas de Informação II.

API REST para gerenciar pedidos de uma pequena loja, feita com **Node.js + Express (JavaScript)**, arquitetura em camadas, validação de dados, tratamento de erros e testes automatizados com **Jest**. Os dados ficam **em memória** (reiniciar o servidor apaga os pedidos).

- **Aluno:** Thiago Ferreira Aguiar
- **RA:** 45531846

## Instalação e execução

Requisitos: Node.js 18 ou superior.

```bash
npm install
npm start          # sobe em http://localhost:3000
npm test           # executa os testes automatizados (Jest + Supertest)
```

A porta pode ser alterada com a variável `PORT` (ex.: `PORT=4000 npm start`).

## Valores aceitos

| Campo | Valores |
|---|---|
| `tipo` | `entrega`, `retirada` |
| `prioridade` | `baixa`, `normal`, `alta` |
| `status` | `recebido`, `em_preparacao`, `enviado`, `entregue`, `cancelado` |

### Regras de transição de status

Todo pedido nasce com status `recebido`.

| Status atual | Pode ir para |
|---|---|
| `recebido` | `em_preparacao`, `cancelado` |
| `em_preparacao` | `enviado`, `cancelado` |
| `enviado` | `entregue` |
| `entregue` | _(estado final)_ |
| `cancelado` | _(estado final)_ |

Justificativa: depois que o pedido foi enviado, não faz sentido cancelá-lo pelo sistema (seria uma devolução, fora do escopo); pedidos entregues ou cancelados não voltam atrás. Transição fora da tabela retorna **400** com mensagem explicativa.

## Rotas

| Método | Rota | Sucesso | Erros |
|---|---|---|---|
| POST | `/pedidos` | 201 | 400 |
| GET | `/pedidos` | 200 | — |
| GET | `/pedidos/:id` | 200 | 400 (id inválido), 404 |
| PATCH | `/pedidos/:id/status` | 200 | 400, 404 |

Qualquer outra rota retorna 404 em JSON. Erros inesperados retornam **500** (`{"erro":"Erro interno do servidor."}`) sem expor detalhes internos.

### Exemplos

**POST /pedidos**

```json
{ "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal" }
```

Resposta `201`:

```json
{ "id": 1, "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal", "status": "recebido" }
```

**POST inválido** (`valor` igual a 0) → `400`:

```json
{ "erro": "O campo \"valor\" deve ser um número maior que zero." }
```

**GET /pedidos/999** → `404`:

```json
{ "erro": "Pedido com id 999 não encontrado." }
```

**PATCH /pedidos/1/status**

```json
{ "status": "em_preparacao" }
```

Resposta `200`: o pedido com `"status": "em_preparacao"`.

**PATCH com transição inválida** (`recebido` → `entregue`) → `400`:

```json
{ "erro": "Transição inválida de \"recebido\" para \"entregue\". Transições permitidas: em_preparacao, cancelado." }
```

### Validações

- `cliente`: texto obrigatório, não vazio após remover espaços das extremidades (o valor salvo já vem sem os espaços).
- `valor`: tipo número (não aceita texto como `"350"`) e maior que zero.
- `tipo` e `prioridade`: devem estar nas listas acima.
- `:id`: inteiro positivo; texto como `abc` retorna 400.
- JSON malformado retorna 400.

## Arquitetura

```
src/
├── server.js                 # inicia o servidor (listen)
├── app.js                    # monta o Express: JSON, rotas, 404 e tratador de erros
├── routes/pedidoRoutes.js    # método + URL -> controller
├── controllers/pedidoController.js  # lê req, chama o service, devolve res/status HTTP
├── services/pedidoService.js # regras de negócio, validações, transições e armazenamento em memória
├── middlewares/errorHandler.js      # 404 de rota e tratamento central de erros
└── errors/AppError.js        # ValidationError (400) e NotFoundError (404)
tests/pedidos.test.js         # testes automatizados
evidencias/                   # capturas do Postman
```

**Fluxo de uma requisição:** `routes` → `controller` → `service` → resposta. Se o service lança `ValidationError`/`NotFoundError`, o `errorHandler` converte em 400/404; qualquer outro erro vira 500.

**Responsabilidades**

- **Routes:** só mapeiam rotas. Não têm lógica.
- **Controllers:** camada HTTP (converte o `:id`, escolhe o status code). Não conhecem regras de negócio.
- **Services:** concentram todas as regras e o "banco" em memória. Não conhecem `req`/`res`, o que facilita testar.
- **Errors/Middleware:** centralizam o mapeamento de erro → resposta HTTP, evitando `try/catch` repetido.

**Padrão implementado:** arquitetura em camadas (Routes → Controllers → Services) com tratamento centralizado de erros por classes de erro customizadas.

## Testes

`npm test` roda 30 testes (Jest + Supertest) cobrindo: criação válida, cada validação inválida, listagem, consulta existente/inexistente/id inválido, fluxo completo de status, transições proibidas, 404, JSON malformado e erro inesperado (500).

## Evidências

A pasta `evidencias/` contém capturas do Postman:

`01-criacao.png`, `02-validacao.png`, `03-listagem.png`, `04-consulta-inexistente.png`, `05-atualizacao.png`.


## Uso de IA

Utilizei o Claude (Anthropic) como apoio. Ele gerou a estrutura inicial do projeto, o código das camadas (routes, controllers, services), os testes com Jest e o rascunho deste README. Eu rodei a aplicação, executei os testes, fiz os testes manuais e capturas no Postman e li o código para entender a responsabilidade de cada camada.

Sugestão aceita: separar os erros em classes ValidationError e NotFoundError tratadas em um middleware central. Aceitei porque evita repetir try/catch nos controllers e deixa claro quando o erro é do usuário (400/404) e quando é inesperado (500).

Sugestão modificada: a IA definiu apenas três prioridades (baixa, normal e alta). Adicionei a prioridade "urgente" porque considerei que a loja precisa distinguir pedidos que devem ser atendidos antes dos demais. Rodei os testes, confirmei no Postman que o POST com "urgente" retorna 201 e atualizei a tabela de valores aceitos no README.

# ConstróiFácil — PRD (Product Requirements Document)

## Visão
App mobile (Expo/React Native) para planejar obras/reformas com **planta 2D interativa**, **orçamento automático** e **ofertas reais por CEP** de múltiplas lojas brasileiras.

## Personas
- Autoconstrutor: quer estimar materiais e encontrar preços melhores.
- Reformador: precisa dimensionar cômodos e comparar lojas por região.

## Features implementadas

### Fase 1 (concluída)
- Autenticação: e-mail + senha (bcrypt) e Google OAuth (Emergent-managed)
- Sessão persistente em SecureStore
- Builder inicial (tipo, medidas, cômodos)
- Estimador de materiais (m² → cimento/areia/blocos/piso/tinta)
- Ofertas Mercado Livre (com tratamento de 403/502)

### Fase 2 (concluída nesta iteração)
- **CEP + Frete regional**: `GET /api/cep/{cep}` via ViaCEP; tabela de frete-base por UF (27 estados)
- **Planta 2D interativa**: canvas em escala real (m→px), cômodos coloridos, arrasto com `react-native-gesture-handler` + `reanimated`, controles ± 0.5m, salvamento via `PUT /api/projects/{id}`
- **Editor de cômodos detalhado**: templates rápidos, dimensões inline, área total × área usada
- **Ofertas multi-loja com filtro**: preço, frete e total; deep-links de busca em Leroy Merlin, C&C, Telhanorte
- **Carrinho comparativo**: `POST/GET/DELETE /api/cart`, agregação por loja, `grand_total = preço + frete`
- **Alertas de preço**: `POST/GET/DELETE /api/alerts` (backend; UI planejada)
- **Refatoração**: monólito `index.tsx` dividido em `src/components/{Auth, Home, Builder, Plan2D, Estimator, Offers, Cart, CepModal, UI}.tsx`

## Endpoints
| Método | Path | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cadastro |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/session` | Google session |
| GET | `/api/auth/me` | Perfil |
| GET | `/api/cep/{cep}` | ViaCEP + frete-base |
| POST | `/api/projects` | Criar projeto |
| GET | `/api/projects` | Listar |
| PUT | `/api/projects/{id}` | Atualizar layout |
| POST | `/api/estimate` | Estimador (materiais + per_room) |
| GET | `/api/templates` | Modelos prontos |
| GET | `/api/offers?q&uf&cep` | Multi-loja + frete |
| POST | `/api/cart` | Adicionar |
| GET | `/api/cart` | Listar + totais |
| DELETE | `/api/cart/{offer_id}` | Remover |
| POST/GET/DELETE | `/api/alerts` | Alertas |

## Coleções Mongo
- `users`, `user_sessions`, `projects`, `cart_items`, `alerts`

## Integrações externas (públicas, sem chave)
- **ViaCEP** (`viacep.com.br`) — 100% público
- **Mercado Livre Search** (`api.mercadolibre.com`) — público, pode limitar; fallback tratado
- **Deep-links de busca** para Leroy Merlin, C&C, Telhanorte (sem scraping)

## Testes
- 14/14 pytest (backend + regressão)
- Testing agent Iteration 5: PASS (frontend/backend)

### Fase 3 (concluída nesta iteração)
- **Modelos Prontos** (`GET /api/templates`): 8 modelos com cômodos e posições pré-definidas — Kitnet 30m², Edícula 25m², Casa 60m² (2 quartos), Casa 90m² (3 quartos com suíte), **Conceito Aberto 70m²**, **Casa 110m² com Piscina + Churrasqueira**, **Sobrado 120m²** (2 pavimentos), **Sobrado 180m²** (4 quartos com suítes). Acessível pelo tile do Home e pelo CTA secundário do hero card.
- **Tela de Alertas** (`Alerts.tsx`): lista de materiais monitorados com preço-alvo, criação via bottom-sheet com sugestões rápidas, deep-link para Ofertas com a busca pré-preenchida.
- **Custo por Cômodo**: `POST /api/estimate` agora inclui `per_room[{name, area, cost, cost_per_m2, share}]`. Multiplicadores refinados por tipo de cômodo:
  - Piscina 2.0x (impermeabilização + azulejo + bomba)
  - Banheiro/Lavabo 1.35x, Cozinha/Área gourmet/Churrasqueira 1.30x
  - Área de serviço/Lavanderia 1.15x, Suíte 1.15x (separada de banheiro puro), Escada 1.10x, Closet 1.05x
  - Sala/Quarto (base) 1.0x, Conceito aberto/Integrado 0.95x
  - Sacada/Varanda 0.70x, Garagem 0.65x, Corredor/Hall 0.55x, Jardim/Quintal 0.50x
- **Editor de cômodos ampliado**: 20 tipos disponíveis com ícones — Sala, Cozinha, Quarto, Suíte, Closet, Banheiro, Lavabo, Área de serviço, **Conceito aberto**, **Área gourmet**, **Churrasqueira**, **Piscina**, Varanda, Sacada, Escritório, Corredor, Escada, Garagem, Jardim, Quintal.

## Backlog
- Planta 3D interativa
- Compartilhar planta como imagem
- Modo escuro
- Notificações push para alertas de preço (requer build nativo)

# API User

API REST construída com NestJS, Prisma e PostgreSQL, executada em containers Docker.

## Sobre o projeto

Este repositório é um **template de estudo** usado para praticar conceitos de Docker, não um projeto de produção. O foco principal foi comparar o **tamanho da imagem antes e depois de aplicar multi-stage build** no `Dockerfile`, além de exercitar o uso de `docker-compose` com rede e volume nomeados para persistência do banco de dados.

Comparação de tamanho de imagem observada durante os testes (`docker image ls`):

![Comando docker image ls](./docs/imagens-docker.png)

| Imagem | Estratégia | Base | Tamanho |
| --- | --- | --- | ---: |
| `api:v1` | Single-stage | `node:22` | ~2GB |
| `api:v2` | Single-stage | `node:22-alpine3.24` | ~609MB |
| `api:v3` | Multi-stage inicial com bibliotecas de desenvolvimento e produção | `node:22-alpine3.24` | ~531MB |
| `api:v4` | Multi-stage inicial com somente bibliotecas de desenvolvimento | `node:22-alpine3.24` | ~258MB |

A redução expressiva de `v1` para `v4` vem de dois fatores: separar a etapa de build (que precisa do toolchain completo do Node) da etapa final de execução, e trocar a imagem base final para uma variante `alpine`, muito mais enxuta.

## Pré-requisitos

- Docker Desktop em execução
- Docker Compose v2, disponível pelo comando `docker compose`
- Portas `3335` e `5432` livres no host

## Como funciona a comunicação

Os serviços `api` e `db` compartilham a rede Docker `api-network`.

| Serviço | Container | Porta no container | Porta no host |
| --- | --- | ---: | ---: |
| API | `api` | `3335` | `3335` |
| PostgreSQL | `db` | `5432` | `5432` |

Dentro da rede Docker, a API deve acessar o banco usando `db:5432`, e não `localhost:5432`.

## Executar os containers

Na raiz do projeto, execute:

```powershell
docker compose up -d --build
```

Esse comando constrói a imagem da API, cria os containers `api` e `db` e os inicia em segundo plano. Para acompanhar a inicialização:

```powershell
docker compose logs -f api db
```

Verifique o estado dos serviços com:

```powershell
docker compose ps
```

A API ficará disponível em `http://localhost:3335` e o PostgreSQL poderá ser acessado pelo host em `localhost:5432`.

## Testar a API e a conexão com o banco

Primeiro, teste a rota de saúde da API:

```powershell
Invoke-RestMethod http://localhost:3335/health
```

Para testar a conexão entre a API e o PostgreSQL, crie um registro. Essa requisição precisa chegar à API e fazer uma inserção no banco usando `db:5432`:

```powershell
Invoke-RestMethod -Method Post http://localhost:3335/registers
```

Uma resposta sem erro indica que a API conseguiu resolver o container `db`, autenticar no PostgreSQL e executar a operação do Prisma.

## Variáveis de ambiente

As variáveis usadas pelo Compose são:

```text
DATABASE_URL=postgresql://user123:user123@db:5432/db?schema=public
PORT=3335
```

O usuário, a senha e o nome do banco correspondem às variáveis `POSTGRESQL_USERNAME`, `POSTGRESQL_PASSWORD` e `POSTGRESQL_DATABASE` do container PostgreSQL.

## Comandos úteis

Parar os containers sem remover os dados:

```powershell
docker compose stop
```

Iniciar novamente os containers já criados:

```powershell
docker compose start
```

Parar e remover os containers e a rede criada pelo Compose, preservando o volume:

```powershell
docker compose down
```

## Execução local das migrações

Com o banco em execução e o projeto configurado para usar a URL abaixo, as migrações podem ser aplicadas a partir do host:

```powershell
$env:DATABASE_URL="postgresql://user123:user123@localhost:5432/db?schema=public"
npx prisma migrate deploy
```

Para desenvolvimento, quando uma nova migração precisar ser criada:

```powershell
$env:DATABASE_URL="postgresql://user123:user123@localhost:5432/db?schema=public"
npx prisma migrate dev --name nome-da-migracao
```

Quando a API estiver rodando no Docker, mantenha `db:5432` na `DATABASE_URL`, pois `localhost:5432` não é o endereço correto entre containers.

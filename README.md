# API User

API REST construída com NestJS, Prisma e PostgreSQL, executada em containers Docker.

## Pré-requisitos

- Docker Desktop em execução
- Docker Compose v2, disponível pelo comando `docker compose`
- Portas `3335` e `5555` livres no host

## Como funciona a comunicação

Os serviços `api` e `db` compartilham a rede Docker `api-network`.

| Serviço | Container | Porta no container | Porta no host |
| --- | --- | ---: | ---: |
| API | `api` | `3335` | `3335` |
| PostgreSQL | `db` | `5432` | `5555` |

Dentro da rede Docker, a API deve acessar o banco usando `db:5432`, e não `localhost:5555`. A porta `5555` existe apenas para permitir acesso ao PostgreSQL a partir da máquina host.

## Preparação dos recursos Docker

O `docker-compose.yaml` usa a rede e o volume como recursos externos. Crie-os uma vez antes da primeira execução:

```powershell
docker network create api-network
docker volume create api-volume
```

Se algum recurso já existir, o Docker informará isso e ele poderá ser reutilizado.

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

A API ficará disponível em `http://localhost:3335` e o PostgreSQL poderá ser acessado pelo host em `localhost:5555`.

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

Também é possível testar diretamente a disponibilidade do PostgreSQL a partir da rede Docker:

```powershell
docker exec db pg_isready -h db -p 5432 -U user123 -d db
```

O resultado esperado contém `accepting connections`.

Confirme que os dois containers estão na mesma rede:

```powershell
docker network inspect api-network
```

Na saída, os containers `api` e `db` devem aparecer na seção `Containers`.

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

Remover também os dados persistidos do PostgreSQL, somente quando isso for desejado:

```powershell
docker compose down
docker volume rm api-volume
```

Reconstruir a imagem sem usar o cache:

```powershell
docker compose build --no-cache api
docker compose up -d
```

## Execução local das migrações

Com o banco em execução e o projeto configurado para usar a URL abaixo, as migrações podem ser aplicadas a partir do host:

```powershell
$env:DATABASE_URL="postgresql://user123:user123@localhost:5555/db?schema=public"
npx prisma migrate deploy
```

Para desenvolvimento, quando uma nova migração precisar ser criada:

```powershell
$env:DATABASE_URL="postgresql://user123:user123@localhost:5555/db?schema=public"
npx prisma migrate dev --name nome-da-migracao
```

Quando a API estiver rodando no Docker, mantenha `db:5432` na `DATABASE_URL`, pois `localhost:5555` não é o endereço correto entre containers.

# API User

API REST de estudo construída com **NestJS**, **Prisma** e **PostgreSQL**. O projeto foi criado para praticar execução local, containers Docker, Docker Compose e um cluster Kubernetes local com Kind.

## O que foi aprendido

De forma geral, este projeto demonstra:

- como uma aplicação Node.js é empacotada em uma imagem Docker;
- a diferença entre uma imagem single-stage e uma imagem multi-stage;
- como o Docker Compose orquestra a API e o banco de dados;
- como redes Docker permitem que um container encontre outro pelo nome do serviço;
- como volumes preservam os dados do PostgreSQL quando os containers são recriados;
- como variáveis de ambiente configuram a aplicação e as credenciais do banco;
- como separar o usuário administrativo do banco do usuário restrito usado pela API;
- como o Prisma aplica migrações e acessa o PostgreSQL;
- como Kubernetes organiza aplicações em Pods, Deployments, Services, Namespaces, Secrets e volumes;
- como o Kind cria um cluster Kubernetes local para desenvolvimento;
- como um Service fornece DNS interno e como um NodePort publica a aplicação no host;
- como liveness, readiness e startup ajudam a verificar a saúde da aplicação;
- como o Metrics Server e o HPA permitem observar e escalar a API conforme o uso de CPU.

## Arquitetura resumida

```text
Cliente
	-> API NestJS (porta 3335)
	-> Prisma
	-> PostgreSQL (porta 5432)
```

## Pré-requisitos

- Node.js e npm;
- Docker Desktop;
- Docker Compose v2, pelo comando `docker compose`;
- Kind e kubectl, caso queira executar o cenário Kubernetes;
- portas `3335` e `5432` livres no host.

Instale as dependências da aplicação:

```powershell
npm install
```

## Endpoints

Base local: `http://localhost:3335`

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| `GET` | `/health/startup` | Verifica a inicialização da API e a conexão disponível. |
| `GET` | `/health/readiness` | Verifica se a API está pronta para receber tráfego; pode retornar `503` se o banco não estiver acessível. |
| `GET` | `/health/liveness` | Verifica se a aplicação está viva. |
| `POST` | `/dados` | Cria um registro no banco. |
| `GET` | `/dados` | Lista registros |
| `GET` | `/status` | Verifica o status da conexão com o banco. |

## Arquivos de requisição HTTP

A pasta [http](http) contém exemplos que podem ser executados por extensões de cliente HTTP do VS Code, como REST Client:

| Arquivo | Requisições |
| --- | --- |
| [health.http](http/health.http) | Startup, readiness e liveness. |
| [register.http](http/register.http) | Criação e listagem de registros em `/dados`. |
| [status.http](http/status.http) | Consulta de `/status`. |

## Outros arquivos Markdown

| Arquivo | Conteúdo |
| --- | --- |
| [README-DOCKER.md](README-DOCKER.md) | Execução com Docker Compose, redes, volumes, imagens, migrações e permissões do PostgreSQL. |
| [README-K8s.md](README-K8s.md) | Execução no Kubernetes com Kind, recursos, armazenamento, HPA, métricas, logs e diagnóstico. |
| [COMANDOS.md](COMANDOS.md) | Lista curta de comandos para criar, aplicar e remover o ambiente Kubernetes. |

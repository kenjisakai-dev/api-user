# API User no Kubernetes

API REST construída com NestJS, Prisma e PostgreSQL, executada em um cluster Kubernetes local criado com Kind.

A documentação da execução com Docker Compose está disponível em [README-DOCKER.md](README-DOCKER.md).

## Arquitetura

O ambiente utiliza dois namespaces:

| Namespace     | Recursos principais                               |
| ------------- | ------------------------------------------------- |
| `desafio-db`  | PostgreSQL, ConfigMap, Secret, PV, PVC e Services |
| `desafio-api` | API NestJS, Secret, Service e HPA                 |

Fluxo de comunicação:

```text
Host :3335
  -> NodePort :30035
  -> Service api-user-service-external :3335
  -> Pods da API
  -> db-service.desafio-db.svc.cluster.local :5432
  -> Pod PostgreSQL
```

O PostgreSQL também é publicado em `localhost:5432` para permitir a execução das migrações do Prisma a partir do host.

## Recursos criados

| Recurso               | Nome                        | Finalidade                                           |
| --------------------- | --------------------------- | ---------------------------------------------------- |
| Cluster Kind          | `api-cluster`               | Cluster Kubernetes local com quatro nós              |
| Namespace             | `desafio-db`                | Isola os recursos do banco                           |
| Namespace             | `desafio-api`               | Isola os recursos da API                             |
| ConfigMap             | `db-configmap`              | Armazena o nome do banco PostgreSQL                  |
| Secret                | `db-secret`                 | Armazena as credenciais do banco                     |
| StorageClass          | `api-storage`               | Define o armazenamento local                         |
| PersistentVolume      | `api-pv`                    | Disponibiliza 5 GiB no nó Kind                       |
| PersistentVolumeClaim | `db-pvc`                    | Solicita 1 GiB para o PostgreSQL                     |
| Deployment            | `db-deployment`             | Executa uma réplica do PostgreSQL                    |
| Service               | `db-service`                | Disponibiliza o banco internamente por DNS           |
| Service               | `db-service-external`       | Publica o banco em `localhost:5432`                  |
| Deployment            | `api-user-deployment`       | Executa os pods da API                               |
| Service               | `api-user-service-external` | Publica a API em `localhost:3335`                    |
| HPA                   | `api-user-hpa`              | Escala a API entre 3 e 6 pods com alvo de 70% de CPU |
| Metrics Server        | `metrics-server`            | Fornece métricas de CPU e memória ao HPA             |

O init container `init-db-permissions` ajusta o proprietário do volume para o usuário `1001`, usado pela imagem Bitnami. Ele configura permissões do sistema de arquivos, não usuários ou permissões SQL.

## Usuários do banco

| Usuário      | Permissões                              | Uso                                                 |
| ------------ | --------------------------------------- | --------------------------------------------------- |
| `postgres`   | Superusuário                            | Administração interna e criação do usuário restrito |
| `user_admin` | Dono do banco e dos objetos             | Aplicação das migrações Prisma                      |
| `app_user`   | `SELECT`, `INSERT`, `UPDATE` e `DELETE` | Conexão da API em runtime                           |

A API usa somente o `app_user`. As migrações usam o `user_admin`, pois precisam criar e alterar objetos do banco.

> Os Secrets deste repositório são apenas para estudo local. Base64 não é criptografia. Em ambientes reais, use um gerenciador de segredos e não versione credenciais.

## Pré-requisitos

- Docker Desktop em execução;
- Kind instalado e disponível como `kind`;
- kubectl instalado e disponível como `kubectl`;
- Node.js e npm instalados;
- portas `3335` e `5432` livres no host.

Execute os comandos em PowerShell, na raiz do projeto.

## 1. Instalar as dependências

```powershell
npm install
```

## 2. Criar o cluster

```powershell
kind create cluster --config k8s/kind.yaml
kubectl cluster-info --context kind-api-cluster
kubectl cluster-info
kubectl get nodes
```

O arquivo `k8s/kind.yaml` publica as seguintes portas:

- API: `localhost:3335` para o NodePort `30035`;
- PostgreSQL: `localhost:5432` para o NodePort `30432`.

## 3. Instalar o Metrics Server

O HPA depende do Metrics Server para obter o consumo de CPU dos pods.

```powershell
kubectl apply -f k8s/metrics-server.yaml
kubectl rollout status deployment/metrics-server -n kube-system --timeout=120s
kubectl top nodes
```

Pode levar alguns segundos até que `kubectl top` comece a retornar métricas.

## 4. Criar o banco e o armazenamento

```powershell
kubectl apply -f k8s/deployment-db.yaml
kubectl rollout status deployment/db-deployment -n desafio-db --timeout=120s
kubectl get pods,services,pvc -n desafio-db
kubectl get pv
```

Antes de continuar, confirme que o pod está `Running`, com `READY 1/1`, e que o PVC está `Bound`.

## 5. Aplicar as migrações

As migrações precisam de permissões DDL e utilizam o usuário `user_admin`:

```powershell
$env:DATABASE_URL="postgresql://user_admin:user_admin@localhost:5432/db?schema=public"
npx prisma migrate deploy
Remove-Item Env:DATABASE_URL
```

O comando `migrate deploy` aplica as migrações versionadas em `prisma/migrations`.

Para criar uma nova migração durante o desenvolvimento:

```powershell
$env:DATABASE_URL="postgresql://user_admin:user_admin@localhost:5432/db?schema=public"
npx prisma migrate dev --name nome-da-migracao
Remove-Item Env:DATABASE_URL
```

Não use `migrate dev` em implantação ou produção.

## 6. Criar o usuário restrito

O script `db/init/01-create-limited-user.sh` cria o `app_user`, sincroniza sua senha e concede apenas as permissões necessárias. O script é idempotente e pode ser executado novamente sem falhar caso o usuário já exista.

Copie e execute o script no pod PostgreSQL:

```powershell
$dbPod = kubectl get pod -n desafio-db -l app=db -o jsonpath="{.items[0].metadata.name}"
kubectl cp db/init/01-create-limited-user.sh "desafio-db/${dbPod}:/tmp/01-create-limited-user.sh" -c db
kubectl exec -n desafio-db $dbPod -c db -- bash /tmp/01-create-limited-user.sh
kubectl exec -n desafio-db $dbPod -c db -- rm -f /tmp/01-create-limited-user.sh
```

Esse passo ocorre depois das migrações para conceder acesso às tabelas existentes. O script também configura privilégios padrão para tabelas e sequences criadas futuramente pelo `user_admin`.

## 7. Criar a API e o HPA

O Secret `api-secret` usa o DNS interno do banco e o usuário restrito:

```text
postgresql://app_user:app_user@db-service.desafio-db.svc.cluster.local:5432/db
```

Aplique o manifesto:

```powershell
kubectl apply -f k8s/deployment-api.yaml
kubectl rollout status deployment/api-user-deployment -n desafio-api --timeout=120s
kubectl get pods,services,hpa -n desafio-api
```

O HPA usa o `requests.cpu` dos containers como base. Com `requests.cpu: 100m` e alvo de `70%`, ele tenta manter o consumo médio próximo de `70m` por pod.

## 8. Testar a integração

Teste a disponibilidade da API e a conexão com o PostgreSQL:

```powershell
Invoke-RestMethod http://localhost:3335/health/startup
Invoke-RestMethod http://localhost:3335/health/readiness
```

Crie um registro e consulte os registros persistidos:

```powershell
Invoke-RestMethod -Method Post http://localhost:3335/dados
Invoke-RestMethod "http://localhost:3335/dados"
```

O sucesso do `POST /dados` comprova que:

1. o NodePort encaminhou a requisição para a API;
2. a API resolveu o DNS do Service do banco;
3. o `app_user` autenticou no PostgreSQL;
4. o usuário restrito possui permissão de `INSERT`.

Para testar pelo DNS interno do cluster:

```powershell
kubectl run -it fortio -n desafio-api --rm --restart=Never --image=fortio/fortio -- load -X POST -qps 400 -t 120s -c 24 http://api-user-service-external:3335/dados
```

Dentro de um pod, não use `localhost:3335` para acessar a API. `localhost` aponta para o próprio pod; use o nome do Service.

## Verificar status, logs e métricas

### Recursos e pods

```powershell
kubectl get all -n desafio-db
kubectl get all -n desafio-api
kubectl get pods -A -o wide
kubectl get pv,pvc -A
```

### Logs

```powershell
kubectl logs deployment/db-deployment -n desafio-db
kubectl logs deployment/api-user-deployment -n desafio-api --all-pods=true --tail=100
```

Logs do init container do banco:

```powershell
kubectl logs deployment/db-deployment -n desafio-db -c init-db-permissions
```

### Eventos e diagnóstico

```powershell
kubectl describe pod -n desafio-db -l app=db
kubectl describe deployment api-user-deployment -n desafio-api
kubectl describe hpa api-user-hpa -n desafio-api
kubectl get events -A --sort-by=.metadata.creationTimestamp
```

### Métricas e HPA

```powershell
kubectl top nodes
kubectl top pods -n desafio-api
kubectl get hpa api-user-hpa -n desafio-api
```

Logo após a criação dos pods, o HPA pode exibir `<unknown>` ou `did not receive metrics for targeted pods`. Isso é normal enquanto os pods ainda não estão prontos ou o Metrics Server aguarda o primeiro ciclo de coleta.

## Validar as permissões do banco

Atualize a variável caso tenha aberto outro terminal:

```powershell
$dbPod = kubectl get pod -n desafio-db -l app=db -o jsonpath="{.items[0].metadata.name}"
```

Uma inserção com `app_user` deve funcionar:

```powershell
kubectl exec -n desafio-db $dbPod -c db -- env PGPASSWORD=app_user psql -U app_user -d db -c "INSERT INTO registers DEFAULT VALUES;"
```

Uma operação DDL deve falhar, pois o `app_user` não é dono da tabela:

```powershell
kubectl exec -n desafio-db $dbPod -c db -- env PGPASSWORD=app_user psql -U app_user -d db -c "DROP TABLE registers;"
```

Resultado esperado:

```text
ERROR: must be owner of table registers
```

## Solução de problemas

### O pod da API não inicia

```powershell
kubectl describe pod -n desafio-api -l app=api-user
kubectl logs deployment/api-user-deployment -n desafio-api --all-pods=true
```

Confirme se o banco está pronto, se as migrações foram aplicadas e se o `app_user` foi criado.

### O HPA não mostra CPU

```powershell
kubectl get pods -n desafio-api
kubectl top pods -n desafio-api
kubectl describe hpa api-user-hpa -n desafio-api
kubectl get apiservice v1beta1.metrics.k8s.io
```

Os pods precisam estar `Ready` e possuir `resources.requests.cpu` para o cálculo percentual do HPA.

## Remover recursos

Remover somente a API e o banco:

```powershell
kubectl delete -f k8s/deployment-api.yaml
kubectl delete -f k8s/deployment-db.yaml
```

Remover todo o cluster e seus dados:

```powershell
kind delete cluster --name api-cluster
```

Para reconstruir o ambiente, crie o cluster novamente e repita os passos a partir da instalação do Metrics Server.

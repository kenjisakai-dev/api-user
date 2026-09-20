# Comandos para iniciar API e DB no kubernetes local

Criar cluster
```bash
kind create cluster --config k8s/kind.yaml
```

Criar pod do banco de dados no Kubernetes
```bash
kubectl apply -f k8s/deployment-db.yaml
```

Criar pod da API no Kubernetes
```bash
kubectl apply -f k8s/deployment-api.yaml
```
# Kubernetes And Terraform

## Repositories

- https://github.com/kubernetes/kubernetes
- https://github.com/hashicorp/terraform

## Referenced Concepts

- Declarative infrastructure map
- Clear ownership boundaries
- Resource inventory
- Environment separation
- Plan-before-change discipline

## Referenced Areas In DataBase

- `project.json`
- `STORAGE_TOPOLOGY.md`
- `docs/contracts/storage-contract.md`
- future machine-readable resource registry

## NOT Copied

- Cluster scheduler
- Terraform state engine
- Provider system
- Reconciliation loop

## Differences

DataBase is a documentation and inventory repository. It may adopt declarative resource maps, but it does not apply infrastructure changes by itself.


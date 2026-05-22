# Simulation Service Test Guide

## Setup

```powershell
docker compose up -d db-simulation redis consul consul-init
npm --workspace=apps/simulation-service run db:deploy
npm --workspace=apps/simulation-service run start:dev
```

Seed at least one maneuver and one maneuver error in `simulation_db`.

## Maneuver Read APIs

```http
GET http://localhost:3008/simulation/maneuvers?licenseCategory=B1
GET http://localhost:3008/simulation/maneuver-errors?licenseCategory=B1
```

Expected: errors endpoint is cacheable. Verify Redis key:

```powershell
docker exec -it luyen-thi-lai-xe-microservices-redis-1 redis-cli keys "simulation:maneuver-errors:*"
```

## Session State Machine

```http
POST http://localhost:3008/simulation/sessions
Authorization: Bearer <student_token>
Content-Type: application/json

{ "licenseCategory": "B1" }
```

Save answer while `IN_PROGRESS`, then submit. A later answer save should fail because the backend owns the state transition.

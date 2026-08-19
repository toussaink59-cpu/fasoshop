# Scripts de validation securite Fasoshop

Tests legers sans framework (Node.js natif). Ne touchent PAS aux 14 tests existants.

## Execution

```bash
# Lancer tous les tests
node tests/validate-security.mjs

# Ou un seul cas
node tests/cases/01-quantity-validation.mjs
```

## Configuration

- `BASE_URL` : URL cible (defaut: `http://localhost:3000`)
- `ADMIN_TOKEN` / `VENDOR_TOKEN` : JWT de test (optionnel, certains cas les utilisent)

Le serveur doit tourner (dev: `npm run dev` ou instance Vercel).

## Cas couverts

1. **01-quantity-validation.mjs** : qty=-1, 0, 1.5, 999 -> doit 400
2. **02-cron-auth.mjs** : CRON sans Bearer -> doit 500 (fail-closed)
3. **03-cache-privacy.mjs** : /api/products avec userId -> Cache-Control: private
4. **04-test-helpers-guard.mjs** : en production (NODE_ENV=production) -> doit 403
5. **05-migration-drift.mjs** : schema_migrations contient toutes les migrations

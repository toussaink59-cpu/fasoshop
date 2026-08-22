# Migrations — Kimoxa

## Source de vérité

`db/schema.sql` est la source de vérité du schéma. Les fichiers de ce dossier
sont appliqués dans l'ordre (numérique) par `npm run db:migrate` et doivent
toujours être **idempotents** (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`
etc.) pour pouvoir être rejoués sans risque sur une base déjà à jour.

## Trou de numérotation 004 → 023

Les migrations 004 à 023 n'existent pas dans ce dossier. Ce n'est pas un
oubli à corriger : les toutes premières évolutions du schéma (juillet-août
2026) ont été appliquées directement en base (console Neon / scripts
ad-hoc sous `db/`) avant que la convention "un fichier de migration versionné
par changement" ne soit adoptée à partir de la migration 024. `db/schema.sql`
reflète bien l'état actuel malgré ce trou — c'est lui qu'il faut consulter
pour connaître le schéma réel, pas la suite des fichiers de `migrations/`.

## Comment ajouter une migration

1. Créer `migrations/0XX_description_courte.sql` (numéro suivant le dernier existant).
2. Écrire du SQL idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, etc.).
3. Mettre à jour `db/schema.sql` en parallèle pour qu'il reste la référence exacte.
4. Lancer `npm run db:migrate` en local (sur une branche Neon de test, jamais sur la prod directement).
5. `node tests/cases/05-migration-drift.mjs` doit passer (vérifie la cohérence migrations ↔ schéma appliqué).

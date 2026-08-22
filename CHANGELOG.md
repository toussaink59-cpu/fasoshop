# Changelog — Kimoxa

Ce fichier démarre le 21 août 2026. L'historique complet (472+ commits
depuis le 20 juillet 2026) reste consultable via `git log`, mais n'est pas
reconstruit ici rétroactivement — ce changelog vise à documenter les
évolutions **à partir de maintenant**, de façon lisible sans avoir à lire
l'historique Git complet.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/).

## [Non publié]

### Sécurité
- Ajout d'une défense en profondeur (vérification de rôle locale) sur les 17 endpoints `/api/admin/*`, en complément du middleware.
- Ajout d'un test générique qui découvre automatiquement toutes les routes API du dépôt et vérifie qu'aucune n'est accessible sans authentification, sauf liste blanche documentée.
- Ajout d'un fichier `security.txt` (RFC 9116) pour le signalement responsable de vulnérabilités.
- Ajout d'un scan de dépendances (`npm audit --audit-level=high`) dans la CI GitHub Actions.
- `tracesSampleRate` Sentry passé de 100% (fixe) à 20% par défaut, configurable sans redéploiement.

### Corrigé
- **[V-01]** `/api/cart/sync` n'était pas couvert par le middleware d'authentification et faisait confiance à un en-tête `x-user-id` falsifiable côté client.
- **[V-03]** Le contenu de l'e-mail de relance panier abandonné faisait confiance au nom/prix/image fournis par le client plutôt qu'à la table `products`.
- **[V-05/V-06]** Plusieurs liens et URLs de secours pointaient encore vers l'ancien domaine `fasoshop.vercel.app` / `fasoshop-xi.vercel.app` au lieu du domaine Kimoxa actuel.

### Ajouté
- Nouveau cron hebdomadaire `cleanup-reset-tokens` : purge les tokens de réinitialisation de mot de passe expirés depuis plus de 30 jours.
- `migrations/README.md` : documente la convention de migration et le trou de numérotation historique 004-023.

---

## Modèle pour les prochaines entrées

```md
## [Date ou version]

### Ajouté
- ...

### Corrigé
- ...

### Sécurité
- ...

### Modifié
- ...
```

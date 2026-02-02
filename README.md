# 🥙 AZADI AGAR

Clone avancé d’Agar.io avec univers personnalisé (frites, kebabs, cafards) et équilibrage dynamique basé sur la masse.

---

## 🗺️ Carte & Caméra

- Grande map **6000×6000** avec bordures physiques
- Grille de fond style Agar.io
- Caméra centrée sur le **centre de masse total** des cellules
- Lissage fluide du mouvement de caméra
- Zoom dynamique selon la masse totale :
  - Petit → plus zoomé
  - Gros → plus dézoomé

**Implémentation :** `app.js`

---

## ⚖️ Joueur, Masse & Vitesse

- Masse unique = vie = taille = puissance
- Rayon d’une cellule = `√(masse) × constante`
- Vitesse = `BASE_SPEED / √(masse)` avec bornes min/max
  - Petite cellule → très rapide
  - Grosse cellule → lente mais toujours mobile
- Masse minimale par cellule : **10**
  - En dessous → la cellule disparaît
- Soft cap de masse par cellule : **22 500**
  - Gain plafonné
  - Pas de limite dure visible

**Implémentation :**
- `Cell`
- `speedFromMass`
- `handleCollisions`

---

## 🖱️ Mouvement

- Suivi de la souris avec inertie et lissage
- Mouvement plus nerveux à petite masse
- Adapté au multicell :
  - Chaque cellule suit la souris indépendamment

**Implémentation :** `Cell.update`

---

## 🍟 Nourriture

- Les “petits points” remplacés par **frites** avec rotation aléatoire
- Taille ajustable
- Gain de masse par frite (`PELLET_MASS`)
- Collisions et absorption fluides
- Éjection de masse (boules jaunes) comestibles par d’autres entités

**Implémentation :** `spawnFood`, `drawFood`

---

## 🥙 Nourriture spéciale

- **Kebabs** sur la map, image dédiée
- Gain de masse significatif
- Chargement d’images pour :
  - Cafard
  - Kebab
  - Frite

**Implémentation :** `spawnKebabs`, `drawFood`

---

## 🔀 Division & Multicell

- Division sur **Espace** avec projection forte vers la souris
- Cooldown de division
- Limite stricte : **16 cellules simultanées**
- Anti-fusion pendant 15 s (répulsion interne, pas de superposition parfaite)
- Fusion progressive après 15 s : attraction douce + transfert de masse graduel

**Implémentation :** `Player.split`, `Player.internal`

---

## 🟡 Éjection de masse

- Touche **W** : éjecte une petite boule vers la souris
- Réduction de masse
- Peut nourrir potentiellement d’autres cellules

**Implémentation :** `Player.eject`

---

## 🪳 Ennemis (cafards / battes)

- IA erratique : vitesse variable, changement de direction aléatoire, rebond sur les bords
- **Cafard :**
  - Sprite PNG orienté selon sa direction (rotation via `atan2`)
  - Rayon augmenté et drain de masse en contact
  - Drain progressif dépendant de la proximité : plus proche → masse perdue plus rapidement
  - Particules vertes lors de la perte de masse
- **Batte :** disque coloré, drain plus dangereux que base
- Difficulté “Difficile” : amplifie le drain

**Implémentation :** `Enemy`, `drawEnemies`, `handleCollisions`

---

## ⚔️ Collisions & Absorption

- Détection circulaire optimisée via **QuadTree** (pellets/frites, éjectés, kebabs, ennemis)
- Absorption nourriture/éjectés/kebabs :
  - Transfert instantané de masse
  - Suppression de l’objet absorbé

**Implémentation :** `Quad`, `rebuildQT`, `handleCollisions`

---

## 🎨 Interface & Thème

- **Accueil :**
  - Fond plein écran avec image et léger flou
  - Logo remplacé par l’image fournie, hauteur fixée à 180 px
  - Font personnalisée appliquée sur tout le menu
  - Sélecteur de thème Sombre/Clair
- **HUD (Masse/Score)** :
  - Masqué sur l’accueil
  - Affiché seulement en jeu

**Implémentation :** `index.html`, `style.css`

---

## ⚡ Rendu & Performance

- Boucle de jeu à ~60 FPS avec interpolation fluide
- Structure des objets et requêtes optimisées via **QuadTree**

**Implémentation :** `loop`, `rebuildQT`

---

## 🔜 Reste à implémenter (pour 100% Agar.io)

- Absorption joueur vs joueur : A absorbe B si `A > 1.1 × B` avec animation progressive et transfert de masse
- Leaderboard top 10 réel, mini-map, mort/respawn complet
- Difficulté dynamique :
  - Plus d’ennemis et plus rapides selon masse totale
  - Régulation de la densité de nourriture
- Multijoueur (serveur Node/WebSocket) :
  - Synchronisation temps réel
  - Anti-triche

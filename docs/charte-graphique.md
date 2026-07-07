# Everypaw — Charte graphique (pour création de posts Instagram)

> À coller / référencer quand tu demandes à Claude (skill `design`, `banner-design`, `brand`) de générer des visuels Instagram. Source : `src/app/globals.css` + landing `src/app/page.tsx`.

## Univers de marque

- **Produit** : journal de vie + livre imprimé souvenir pour animaux de compagnie.
- **Ton** : chaleureux, tendre, intime, nostalgique. Artisanal/premium, pas tech-froid.
- **Émotion visée** : souvenir précieux, lien, douceur. Jamais criard ni « pet-shop ».
- **Marchés** : 🇺🇸 + 🇫🇷 (textes EN/FR).

## Couleurs

| Rôle | Hex | Usage |
| --- | --- | --- |
| Brand (ochre) | `#C8813A` | CTA, accents, chiffres clés |
| Brand foncé | `#B5712E` | hover, dégradés |
| Or doux | `#F7C27A` | accent sur fonds sombres uniquement |
| Fond crème | `#F7F2EA` | fond principal posts clairs |
| Fond carte | `#FDFAF5` | cartes, encadrés (presque blanc chaud) |
| Fond alt | `#EDE5D4` | sections alternées beige |
| Espresso | `#3D2B1F` | texte principal + fonds sombres |
| Espresso profond | `#2a1d12` | couverture livre, fonds très sombres |
| Texte atténué | `#7A5C44` | sous-titres |
| Texte ténu | `#9A8070` | légendes, mentions |

**Palette = terre/sépia chaude.** Pas de bleu, pas de néon, pas de blanc pur (#FFF). Blancs → toujours crème `#FDFAF5`/`#F7F2EA`.

## Typographie

- **Titres** : serif **Georgia** (équivalent Google Fonts si Georgia indispo : **Lora**, **Fraunces** ou **PT Serif**). Poids 600. Italique pour citations/émotion (« La Vie de Max »).
- **Corps / labels** : **DM Sans** (poids 300/400/500).
- Règle : serif = cœur émotionnel (nom de l'animal, citation, titre livre) ; sans-serif = info pratique.

## Formes & style

- Boutons : **pilule** (border-radius 100px), fond `#C8813A`, texte `#FDFAF5`.
- Cartes : coins arrondis 14–20px, ombre brune douce `0 8px 24px rgba(61,43,31,.12)`.
- Bordures : `rgba(61,43,31,.1)` fines.
- Pas de bords durs, pas d'ombres grises/froides — toujours teintées brun.

## Imagerie

- **Génération IA** (pas de banque photo). Toujours préciser dans le prompt : animaux **chaleureux, lumière naturelle dorée, heure dorée**, grain doux, faible profondeur de champ.
- Mise en scène « album souvenir » : pages de livre, écriture manuscrite italique, dates ordinales (« 1er juillet » / « July 1st »).
- Éviter : stock froid, fond studio blanc clinique, filtres saturés bleus, rendu 3D plastique.

## Specs Instagram

- **Post carré** : 1080×1080
- **Portrait** : 1080×1350
- **Story / Reel** : 1080×1920
- Garder marges sûres ~120px ; texte serif grand + 1 CTA pilule max.

## Logo

- **Icône** : empreinte de patte (3 orteils + coussinet ovale) ochre `#C8813A` avec reflets plus clairs, sur **carré arrondi espresso** `#3D2B1F` (coins ~25%).
- Variantes : patte ochre sur fond espresso (principal), ou patte espresso sur fond crème.
- **Wordmark** : « everypaw » en Georgia serif, `#3D2B1F` ou `#C8813A`.
- Fichier : `docs/logo-everypaw.png`.
- Placement IG : coin ou centre-haut, ~10–15% largeur. Marge de protection = hauteur d'une patte.

## Prompt prêt-à-coller (résumé)

```
Marque: Everypaw — journal de vie & livre souvenir pour animaux. Ton chaleureux, nostalgique, premium artisanal.
Palette sépia chaude: brand ochre #C8813A, fonds crème #F7F2EA / #FDFAF5, sombre espresso #3D2B1F / #2a1d12, accent or #F7C27A. Aucun bleu/néon, pas de blanc pur.
Typo: titres serif Georgia (ou Lora/Fraunces) poids 600, italique pour l'émotion; corps DM Sans.
Formes: boutons pilule, cartes arrondies 14-20px, ombres brunes douces.
Imagerie: génération IA, animaux lumière dorée naturelle/heure dorée, ambiance album souvenir, grain doux. Pas de bleu, pas de blanc pur, pas de 3D plastique.
Logo: empreinte de patte ochre sur carré arrondi espresso (docs/logo-everypaw.png), coin ou centre-haut ~12%.
Format IG: carré 1080x1080 (ou story 1080x1920), titre serif Georgia + 1 CTA pilule #C8813A.
```

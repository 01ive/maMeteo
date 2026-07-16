# 🌤️ Ma Météo

Une application web interactive pour visualiser et analyser les données météorologiques en détail ! 

Explorez les conditions atmosphériques à travers des cartes intuitives, des tableaux de vent détaillés et des émagrammes professionnels.

## 🎯 Pourquoi faire?

Comprendre la météo, c'est bien plus que regarder un thermomètre ! Cette application vous permet de :
- 🗺️ Visualiser les conditions météorologiques sur une carte interactive
- 📊 Analyser les profils verticaux de l'atmosphère
- 💨 Interpréter les vitesses et directions du vent avec un code couleur intuitif
- ☁️ Comprendre la formation des nuages et les phénomènes thermiques
- 🎓 Accéder à des explications scientifiques détaillées et visualisations avancées

Parfait pour les amateurs de météo, les pilotes, les parapentistes et tous ceux qui veulent vraiment comprendre le ciel au-dessus de leur tête !

## 🚀 Utilisation

1. Ouvrez l'application dans votre navigateur
2. Naviguez sur la carte pour explorer différentes régions
3. Consultez les données météorologiques affichées en temps réel
4. Utilisez l'émagramme pour analyser les profils atmosphériques
5. Explorez les explications détaillées pour comprendre chaque concept

## 📋 Les éléments

### 🗺️ La carte

La carte interactive vous permet de visualiser les conditions météorologiques à différents endroits.

### 🎛️ Sélection des informations

Personnalisez l'affichage des données selon vos besoins et préférences.

### 💨 La table des vents

#### 🎨 Code couleur du vent

- 🟢 **Vert** < 15 km/h — Calme, peu de vent
- 🟡 **Jaune** < 30 km/h — Vent faible à modéré
- 🟠 **Orange** < 50 km/h — Vent modéré à soutenu
- 🔴 **Rouge** < 100 km/h — Vent soutenu à fort
- 🟣 **Violet** ≥ 100 km/h — Vent très violent

#### ☁️ Nébulosité

Un nuage se forme lorsque l'air est saturé en humidité (100%). Sur un sondage, cela se traduit visuellement par la rencontre de la courbe de Température et de la courbe du Point de rosée.

Il suffit de calculer l'écart entre ces deux valeurs (ce qu'on appelle le Spread).
* Si $T - T_d \le 1.5^\circ\text{C}$ : C'est un nuage dense (fond gris foncé).
* Si $T - T_d \le 3.0^\circ\text{C}$ : L'air est très humide, bordure de nuage ou brouillard léger (fond gris très clair).

#### 📈 Instabilité

Pour modéliser le plafond thermique de manière autonome, nous appliquons la méthode météorologique classique du soulèvement de la parcelle d'air :

- **Le déclencheur** : On prend la température au sol prévue par le modèle à laquelle on ajoute un "déclencheur" de surchauffe (ici $+2.5^\circ\text{C}$) pour simuler une bulle d'air qui se détache du sol.

⚠️ La température au **sol à 2m** donnée par les models est souvent différente de la température de la **courbe de température**. Celà donne donc lieu à des **décallages**.

- **Le gradient adiabatique sec** : On simule la montée de cette bulle. En s'élevant et en se dilatant, elle se refroidit d'environ $0.98^\circ\text{C}$ tous les $100\text{m}$.

- **Le calcul** : Pour chaque niveau d'altitude $Z$, on calcule la température de la bulle avec la formule : $T_{parcelle} = T_{sol} + 2.5 - \left(\frac{Z}{100} \times 0.98\right)$

- **L'inversion** : On compare cette température à l'air environnant ($T_{env}$). Tant que $T_{parcelle} \ge T_{env}$, la bulle est plus chaude que l'air autour d'elle et continue de monter. Dès qu'elle devient plus froide, le thermique s'arrête net : c'est notre plafond espéré.

L'algorithme calcule ce processus pour les 24 heures et appliquer un trait rouge en bas de la cellule correspondante.

**La base du nuage** : Si cette bulle invisible atteint le point de saturation (100% d'humidité) pendant sa montée, un nuage commence à se former. C'est le niveau de condensation, et cela correspond généralement à notre trait rouge.

**Le haut du nuage** (⚠️ non représenté): Une fois que le nuage se forme, la physique change radicalement. La condensation de la vapeur d'eau en gouttelettes libère de l'énergie (la chaleur latente). L'air à l'intérieur du nuage se refroidit alors beaucoup moins vite en montant (environ 0,5°C tous les 100m). Grâce à ce "moteur" thermique interne, l'air du nuage reste plus chaud que l'extérieur et continue de monter, formant le développement vertical du nuage.

### 📊 L'émagramme

Le diagramme thermodynamique pour analyser la stabilité atmosphérique et les phénomènes de convection.

### 🌈 Coloration de l'émagramme

On colorise la courbe de l'adiabatique séche via le gradient thermique vertical (le taux de refroidissement de l'air avec l'altitude) de la façon suivante :

* 🔴 **Rouge** (> 0.9°C/100m) : Masse d'air très instable (proche ou supérieure à l'adiabatique sèche). Les ascendances thermiques seront fortes et l'air monte facilement.
* ⬛ **Noir** (0.6 à 0.9°C/100m) : Instabilité conditionnelle (ou instabilité latente).
* 🟢 **Vert** (< 0.6°C/100m) : Masse d'air stable (adiabatique humide, isothermie ou inversion de température). Les mouvements verticaux sont bloqués.

#### 📐 Skew-T (Diagramme incliné)

Dans les représentations météorologiques classiques, on "couche" (on incline) les lignes de température vers la droite. Pourquoi ? Parce que dans la troposphère, la température baisse naturellement avec l'altitude. En inclinant le graphique, une masse d'air standard apparaît comme une ligne verticale, ce qui permet à l'œil humain de repérer beaucoup plus facilement les anomalies, les inversions thermiques et les zones d'instabilité (comme la fameuse CAPE pour les orages ou les thermiques).

Sur un graphique cartésien classique (Température en X, Altitude en Y), la courbe de température d'une atmosphère standard part en diagonale vers la gauche, car l'air se refroidit en montant (on perd environ 6.5°C tous les 1000m).

Le problème, c'est que l'œil humain repère très mal les petites variations sur une ligne en diagonale. Les météorologues ont donc inventé le Skew-T : ils inclinent ("skew") les lignes de température vers la droite pour compenser ce refroidissement naturel. Ainsi, une masse d'air standard apparaît presque verticale, et la moindre instabilité saute aux yeux.

Pour incliner la courbe dans Chart.js (qui ne fait que des graphiques droits), nous appliquons cette formule à chaque point :$$T_{skew} = T_{reel} + k \times (1000 - P)$$

$T_{skew}$ : La fausse température donnée au graphique pour décaler le point.

$T_{reel}$ : La vraie température physique.$k$ : Notre fameux SKEW_FACTOR.

$P$ : La pression du palier en hPa.

$1000$ : Notre niveau de référence (le sol).

##### 💡 Pourquoi exactement 0.08 ?

Le choix de 0.08 est un compromis visuel parfait pour la taille de notre fenêtre web et notre plage d'altitude. Faisons le calcul avec la plus haute altitude de notre tableau (200 hPa, soit 11 800m) :

Différence de pression avec le sol : $1000 - 200 = 800$ hPa.

Décalage appliqué : $800 \times 0.04 = 64$.

Cela signifie qu'au sommet du graphique, le point de température est décalé artificiellement de 64 degrés vers la droite.Si l'on considère qu'au sol il fait 15°C, à 11 800m il fait environ -50°C.Sans décalage, la courbe irait de 15 à -50 (soit un énorme écart visuel de 65 unités vers la gauche, la courbe serait très aplatie).Avec notre décalage de +64, le point haut se place à +14 sur l'axe X ($-50 + 64$). La courbe est redressée, reste au centre de l'écran et imite l'angle de ~45° d'un véritable émagramme papier.

---

## 💡 Caractéristiques principales

✨ **Interface intuitive** — Facile à prendre en main  
🎯 **Données précises** — Modèles météorologiques fiables  
📱 **Responsive** — Fonctionne sur tous les appareils  
⚡ **Performance** — Chargement rapide et fluide  
🔍 **Détails avancés** — Pour les passionnés de météo

---

**Amusez-vous à explorer l'atmosphère ! 🌈 Envole-toi ! ✈️**

## 📜 Licences

Ce projet s'appuie sur d'excellentes bibliothèques et services open-source. Voici les licences correspondantes :

| Bibliothèque | Licence | Description |
|---|---|---|
| **[Open-Meteo](https://open-meteo.com/)** | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | API météorologiques gratuites et open-source |
| **[Leaflet](https://leafletjs.com/)** | [BSD 2-Clause](https://github.com/Leaflet/Leaflet/blob/main/LICENSE) | Bibliothèque JavaScript pour cartes interactives |
| **[Chart.js](https://www.chartjs.org/)** | [MIT](https://github.com/chartjs/Chart.js/blob/master/LICENSE.md) | Bibliothèque de graphiques JavaScript |
| **[OpenStreetMap](https://www.openstreetmap.org/)** | [ODbL](https://opendatacommons.org/licenses/odbl/) | Données cartographiques libres |

### 📖 Conditions d'utilisation

- ✅ Vous êtes libre d'utiliser, modifier et distribuer ce projet confiramant à sa licence (fichier **LICENSE**)
- 📝 Veuillez respecter les termes de chaque licence
- 🔗 Mentionnez les sources et contributeurs (attribution requise)
- 🌍 Partagez vos améliorations avec la communauté

Merci à tous ! 🙏

**01ive** 🪂
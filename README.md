# Ma météo

## Pourquoi faire?

## Utilisation

## Les éléments

### La carte

### Sélection des informations

### La table des vents

#### Code couleur du vent

- Vert < 15 km/h
- Jaune < 30km/h
- Orange < 50 km/h
- Rouge < 100 km/h
- Violet >= 100 km/h

#### Nébulosité

Un nuage se forme lorsque l'air est saturé en humidité (100%). Sur un sondage, cela se traduit visuellement par la rencontre de la courbe de Température et de la courbe du Point de rosée.

Il suffit de calculer l'écart entre ces deux valeurs (ce qu'on appelle le Spread).
* Si $T - T_d \le 1.5^\circ\text{C}$ : C'est un nuage dense (fond gris foncé).
* Si $T - T_d \le 3.0^\circ\text{C}$ : L'air est très humide, bordure de nuage ou brouillard léger (fond gris très clair).

#### Instabilité

Pour modéliser ce plafond thermique de manière autonome, nous appliquons la méthode météorologique classique du soulèvement de la parcelle d'air :

Le déclencheur : On prend la température au sol prévue par le modèle à laquelle on ajoute un "déclencheur" de surchauffe (ici $+2.5^\circ\text{C}$) pour simuler une bulle d'air qui se détache du sol.

Le gradient adiabatique sec : On simule la montée de cette bulle. En s'élevant et en se dilatant, elle se refroidit d'environ $0.98^\circ\text{C}$ tous les $100\text{m}$.

Le calcul : Pour chaque niveau d'altitude $Z$, on calcule la température de la bulle avec la formule : $T_{parcelle} = T_{sol} + 2.5 - \left(\frac{Z}{100} \times 0.98\right)$

L'inversion : On compare cette température à l'air environnant ($T_{env}$). Tant que $T_{parcelle} \ge T_{env}$, la bulle est plus chaude que l'air autour d'elle et continue de monter. Dès qu'elle devient plus froide, le thermique s'arrête net : c'est notre plafond espéré.

L'algorithme calcule ce processus pour les 24 heures et appliquer un trait rouge en bas de la cellule correspondante.



La base du nuage : Si cette bulle invisible atteint le point de saturation (100% d'humidité) pendant sa montée, un nuage commence à se former. C'est le niveau de condensation, et cela correspond généralement à notre trait rouge.

Le haut du nuage : Une fois que le nuage se forme, la physique change radicalement. La condensation de la vapeur d'eau en gouttelettes libère de l'énergie (la chaleur latente). L'air à l'intérieur du nuage se refroidit alors beaucoup moins vite en montant (environ 0,5°C tous les 100m). Grâce à ce "moteur" thermique interne, l'air du nuage reste plus chaud que l'extérieur et continue de monter, formant le développement vertical du nuage.

### L'émagramme

### Coloration émagramme

On colorise la courbe de l'adiabatique séche via le gradient thermique vertical (le taux de refroidissement de l'air avec l'altitude) de la façon suivante :

* Rouge (> 0.9°C/100m) : Masse d'air très instable (proche ou supérieure à l'adiabatique sèche). Les ascendances thermiques seront fortes et l'air monte facilement.
* Noir (0.6 à 0.9°C/100m) : Instabilité conditionnelle (ou instabilité latente).
* Vert (< 0.6°C/100m) : Masse d'air stable (adiabatique humide, isothermie ou inversion de température). Les mouvements verticaux sont bloqués.

#### Skew-T

Dans les représentations météorologiques classiques, on "couche" (on incline) les lignes de température vers la droite. Pourquoi ? Parce que dans la troposphère, la température baisse naturellement avec l'altitude. En inclinant le graphique, une masse d'air standard apparaît comme une ligne verticale, ce qui permet à l'œil humain de repérer beaucoup plus facilement les anomalies, les inversions thermiques et les zones d'instabilité (comme la fameuse CAPE pour les orages ou les thermiques).

Afin de le représenter, on ajoute un biais à la température qui augmente au fur et à mesure que la pression baisse.La formule : $T_{skew} = T_{reel} + k \times (1000 - P)$
(Où $k$ est notre facteur d'inclinaison, et $P$ la pression du palier).

SKEW_FACTOR = 0.08


Sur un graphique cartésien classique (Température en X, Altitude en Y), la courbe de température d'une atmosphère standard part en diagonale vers la gauche, car l'air se refroidit en montant (on perd environ 6.5°C tous les 1000m).

Le problème, c'est que l'œil humain repère très mal les petites variations sur une ligne en diagonale. Les météorologues ont donc inventé le Skew-T : ils inclinent ("skew") les lignes de température vers la droite pour compenser ce refroidissement naturel. Ainsi, une masse d'air standard apparaît presque verticale, et la moindre instabilité saute aux yeux.

Pour incliner la courbe dans Chart.js (qui ne fait que des graphiques droits), nous appliquons cette formule à chaque point :$$T_{skew} = T_{reel} + k \times (1000 - P)$$

$T_{skew}$ : La fausse température donnée au graphique pour décaler le point.

$T_{reel}$ : La vraie température physique.$k$ : Notre fameux SKEW_FACTOR.

$P$ : La pression du palier en hPa.

$1000$ : Notre niveau de référence (le sol).


3. Pourquoi exactement 0.08 ?

Le choix de 0.08 est un compromis visuel parfait pour la taille de notre fenêtre web et notre plage d'altitude. Faisons le calcul avec la plus haute altitude de notre tableau (200 hPa, soit 11 800m) :

Différence de pression avec le sol : $1000 - 200 = 800$ hPa.

Décalage appliqué : $800 \times 0.04 = 64$.

Cela signifie qu'au sommet du graphique, le point de température est décalé artificiellement de 64 degrés vers la droite.Si l'on considère qu'au sol il fait 15°C, à 11 800m il fait environ -50°C.Sans décalage, la courbe irait de 15 à -50 (soit un énorme écart visuel de 65 unités vers la gauche, la courbe serait très aplatie).Avec notre décalage de +64, le point haut se place à +14 sur l'axe X ($-50 + 64$). La courbe est redressée, reste au centre de l'écran et imite l'angle de ~45° d'un véritable émagramme papier.


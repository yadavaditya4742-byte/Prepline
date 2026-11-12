import { r } from './helpers';

/*
 * Budget Mediterranean dinners. Original Prepline recipes, built from staples an
 * Indian-leaning kitchen already buys (chickpeas, lentils, yogurt, chicken, spinach),
 * so mixing cuisines in one week doesn't mean buying a second pantry.
 */
export const MEDITERRANEAN_BUDGET = [
  r({
    id: 'lemon-chicken-potato-tray',
    title: 'Lemon-Oregano Chicken & Potato Tray',
    cuisine: 'Mediterranean', minutes: 50,
    appliances: ['oven'],
    blurb: 'Thighs and potatoes roasted in lemon and garlic, with a cool yogurt-garlic sauce.',
    items: [['chicken-thigh', 800], ['potato', 900], ['lemon', 2], ['garlic', 15], ['oregano', 3], ['olive-oil', 30], ['greek-yogurt', 200], ['salt', 7], ['black-pepper', 2]],
    steps: [
      'Heat oven to 425°F. Cut potatoes into wedges and toss with half the oil, oregano, salt and pepper.',
      'Rub chicken with the rest of the oil, grated garlic, lemon zest and juice, and a little salt.',
      'Roast potatoes 15 minutes, add the chicken, and roast 25 minutes more until golden.',
      'Stir a pinch of garlic and salt into the yogurt and serve on the side.',
    ],
  }),
  r({
    id: 'lentil-spinach-lemon-soup',
    title: 'Lentil, Spinach & Lemon Soup with Yogurt',
    cuisine: 'Mediterranean', minutes: 40,
    blurb: 'A thick, cumin-scented lentil soup brightened with lemon and finished with yogurt.',
    items: [['green-lentils', 300], ['onion', 200], ['carrot', 150], ['garlic', 12], ['crushed-tomato', 400], ['frozen-spinach', 283], ['veg-broth', 946], ['cumin', 4], ['lemon', 1], ['olive-oil', 20], ['greek-yogurt', 300], ['pita', 4], ['salt', 7]],
    steps: [
      'Soften chopped onion and carrot in oil for 6 minutes; add garlic and cumin for 1 minute.',
      'Add rinsed lentils, tomatoes and broth. Simmer 25 minutes until the lentils are soft.',
      'Stir in the spinach, cook 3 minutes, then add lemon juice and salt to taste.',
      'Serve with a spoon of yogurt on each bowl and warm pita.',
    ],
  }),
  r({
    id: 'tomato-chickpea-baked-eggs',
    title: 'Tomato-Chickpea Baked Eggs with Feta',
    cuisine: 'Mediterranean', minutes: 30,
    blurb: 'Eggs poached in a smoky pepper-and-chickpea tomato sauce, with feta and pita.',
    items: [['egg', 8], ['chickpeas-can', 878], ['crushed-tomato', 794], ['onion', 150], ['bell-pepper', 200], ['garlic', 10], ['paprika', 4], ['cumin', 3], ['feta', 80], ['olive-oil', 20], ['parsley', 20], ['pita', 4], ['salt', 5]],
    steps: [
      'Cook sliced onion and pepper in oil until soft; add garlic, paprika and cumin.',
      'Add tomatoes and drained chickpeas and simmer 10 minutes until thick. Season.',
      'Make 8 hollows, crack in the eggs, cover and cook 6–8 minutes until the whites set.',
      'Top with crumbled feta and parsley; serve with pita for scooping.',
    ],
  }),
  r({
    id: 'chicken-bulgur-pilaf',
    title: 'Herby Chicken & Bulgur Pilaf',
    cuisine: 'Mediterranean', minutes: 35,
    blurb: 'One-pot chicken and nutty bulgur with tomato, parsley and lemon.',
    items: [['chicken-breast', 700], ['bulgur', 300], ['onion', 150], ['tomato', 300], ['garlic', 10], ['veg-broth', 700], ['cumin', 3], ['paprika', 3], ['parsley', 40], ['lemon', 1], ['olive-oil', 20], ['greek-yogurt', 200], ['salt', 7]],
    steps: [
      'Brown bite-size chicken in oil with cumin, paprika and salt; set aside.',
      'Soften onion in the same pot, add garlic and chopped tomato and cook 3 minutes.',
      'Stir in bulgur and broth, return the chicken, cover and simmer 15 minutes. Rest 5 minutes.',
      'Fold in parsley and lemon juice. Serve with yogurt.',
    ],
  }),
  r({
    id: 'tuna-white-bean-bowls',
    title: 'Lemony Tuna & White Bean Bowls',
    cuisine: 'Mediterranean', minutes: 15,
    blurb: 'No-cook bowls of tuna, creamy beans and crunchy vegetables in a mustard-lemon dressing.',
    items: [['tuna-can', 568], ['white-beans-can', 878], ['cucumber', 300], ['tomato', 300], ['red-onion', 80], ['parsley', 30], ['lemon', 2], ['olive-oil', 30], ['dijon', 15], ['pita', 4], ['salt', 4], ['black-pepper', 2]],
    steps: [
      'Whisk lemon juice, oil, mustard, salt and pepper in a big bowl.',
      'Add rinsed beans, finely sliced red onion and chopped cucumber and tomato.',
      'Fold in the drained tuna and parsley, keeping some chunks.',
      'Warm the pitas in a dry pan and serve alongside.',
    ],
  }),
  r({
    id: 'braised-chickpeas-spinach-couscous',
    title: 'Braised Chickpeas & Spinach over Couscous',
    cuisine: 'Mediterranean', minutes: 25,
    blurb: 'Chickpeas simmered with tomato, garlic and greens, finished with salty feta.',
    items: [['chickpeas-can', 878], ['couscous', 250], ['crushed-tomato', 794], ['frozen-spinach', 283], ['onion', 150], ['garlic', 12], ['cumin', 3], ['paprika', 3], ['feta', 120], ['olive-oil', 25], ['lemon', 1], ['salt', 6]],
    steps: [
      'Soften onion in oil, then add garlic, cumin and paprika for a minute.',
      'Add tomatoes, chickpeas and spinach; simmer 12 minutes until thick.',
      'Pour boiling water over the couscous with a pinch of salt, cover 5 minutes, then fluff with lemon juice.',
      'Spoon the chickpeas over couscous and crumble feta on top.',
    ],
  }),
  r({
    id: 'garlic-tilapia-white-beans',
    title: 'Garlic-Lemon Fish with White Beans & Greens',
    cuisine: 'Mediterranean', minutes: 25,
    blurb: 'Flaky fish over warm garlicky beans and wilted spinach.',
    items: [['tilapia', 680], ['white-beans-can', 878], ['spinach', 283], ['garlic', 15], ['lemon', 2], ['olive-oil', 30], ['chili-flakes', 1], ['parsley', 20], ['salt', 6], ['black-pepper', 2]],
    steps: [
      'Season fish with salt, pepper and lemon zest. Sear in half the oil 3 minutes per side; set aside.',
      'Add the rest of the oil, garlic and chili flakes to the pan for 1 minute.',
      'Add beans with a splash of water and simmer 4 minutes; stir in spinach until wilted.',
      'Return the fish, squeeze over lemon and scatter parsley.',
    ],
  }),
  r({
    id: 'spiced-chicken-pitas',
    title: 'Spiced Chicken Pitas with Garlic Yogurt',
    cuisine: 'Mediterranean', minutes: 30,
    blurb: 'Paprika-cumin chicken stuffed in warm pitas with crunchy salad and garlicky yogurt.',
    items: [['chicken-thigh', 700], ['pita', 6], ['greek-yogurt', 300], ['cucumber', 300], ['tomato', 250], ['red-onion', 80], ['paprika', 4], ['cumin', 3], ['oregano', 2], ['garlic', 10], ['lemon', 1], ['olive-oil', 20], ['salt', 7]],
    steps: [
      'Toss sliced chicken with paprika, cumin, oregano, half the garlic, oil and salt.',
      'Cook in a hot pan 8–10 minutes until charred and cooked through.',
      'Mix yogurt with the rest of the garlic, lemon juice and salt. Chop cucumber, tomato and onion.',
      'Warm the pitas and fill with chicken, salad and yogurt sauce.',
    ],
  }),
  r({
    id: 'zucchini-feta-frittata',
    title: 'Zucchini, Feta & White Bean Frittata',
    cuisine: 'Mediterranean', minutes: 30,
    appliances: ['stovetop', 'oven'],
    blurb: 'A thick, oven-finished frittata with soft zucchini, beans and feta.',
    items: [['egg', 10], ['cottage-cheese', 200], ['zucchini', 454], ['white-beans-can', 439], ['feta', 100], ['onion', 100], ['oregano', 2], ['parsley', 20], ['olive-oil', 20], ['salt', 4], ['black-pepper', 2]],
    steps: [
      'Heat oven to 400°F. Soften sliced onion and zucchini in an oven-safe pan with oil, 8 minutes.',
      'Whisk eggs with cottage cheese, oregano, salt and pepper.',
      'Add the drained beans to the pan, pour in the eggs and crumble over feta.',
      'Cook 3 minutes on the stove, then bake 12–15 minutes until set. Top with parsley.',
    ],
  }),
  r({
    id: 'lemon-chicken-orzo-soup',
    title: 'Lemon Chicken, Orzo & Chickpea Soup',
    cuisine: 'Mediterranean', minutes: 35,
    blurb: 'A silky lemon-egg broth with chicken, orzo and chickpeas.',
    items: [['chicken-breast', 500], ['orzo', 200], ['chickpeas-can', 439], ['egg', 2], ['lemon', 2], ['carrot', 150], ['onion', 150], ['celery', 100], ['chicken-broth', 1892], ['olive-oil', 15], ['parsley', 20], ['salt', 5]],
    steps: [
      'Soften diced onion, carrot and celery in oil. Add broth and whole chicken breasts; simmer 15 minutes.',
      'Lift out and shred the chicken. Add orzo and chickpeas to the pot and cook 8 minutes.',
      'Whisk eggs with lemon juice, then slowly whisk in a ladle of hot broth.',
      'Off the heat, stir the egg mixture into the soup, return the chicken and add parsley.',
    ],
  }),
];

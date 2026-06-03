# Rune Arena

RuneArena is a turn-based creature fighting game where you can battle, buy items in the marketplace and level up your creatures. It is inspired by the roman empire and its colosseum. The game is built with React, TypeScript and Vite. 

You can play it on its own deployed [website](rune-arena.vercel.app), or through https://loopland.se/.


## Features

- **PVE battle** with creatures
- **Store page** to buy **items** and spend **in-game currency**
- **Inventory** and item use integration for in-battle effects
- **Level up** system for creatures, giving new moves
- **Turtorial/help** screen to help with uncertainties and game information


## Tech stack

- React
- TypeScript
- Vite
- CSS Modules
- Supabase


## Get Started

1. Clone the repo:

```bash
git clone https://github.com/Otloir/Rune-Arena.git
cd rune-arena
```

2. Install dependencies

```bash
npm install
```

3. Add .env.local file and keys to the root:

```bash
VITE_SUPABASE_URL=<SUPABASE_URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<SUPABASE_PUBLISHABLE_KEY>
VITE_TIVOLI_API_URL=<CENTRALBANK_WEBSITE>
VITE_AMUSEMENT_API_KEY=<ACCESS_KEY>
```

4. Run the dev server:

```bash
npm run dev
```


## License

See the `LICENSE` file in this repository.


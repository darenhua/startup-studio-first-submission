# Request for Game Assets

This document lists the game assets that would enhance the visual quality of the 7 games. Currently, all games use Phaser's built-in graphics primitives (rectangles, circles, text/emojis). Adding proper sprites would significantly improve the visual appeal.

---

## 1. Snake Game (`/snake`)

**Current State:** Uses colored rectangles and graphics primitives.

**Requested Assets:**
- `snake-head.png` - Snake head sprite (32x32px), facing right
- `snake-body.png` - Snake body segment (32x32px)
- `snake-tail.png` - Snake tail sprite (32x32px)
- `snake-turn.png` - Snake turn/corner piece (32x32px)
- `food-apple.png` - Apple or fruit sprite (32x32px)
- `grid-tile.png` - Subtle grid background tile (32x32px, tileable)

---

## 2. Minesweeper Game (`/minesweeper`)

**Current State:** Uses colored rectangles with text numbers.

**Requested Assets:**
- `tile-unrevealed.png` - Raised/3D unrevealed tile (40x40px)
- `tile-revealed.png` - Flat revealed tile (40x40px)
- `mine.png` - Mine/bomb sprite (32x32px)
- `flag.png` - Flag marker sprite (32x32px)
- `numbers-1-8.png` - Stylized number sprites (or sprite sheet)
- `explosion.png` - Explosion effect sprite sheet (for mine hit)

---

## 3. Platformer Game (`/platformer`)

**Current State:** Uses colored rectangles for player and platforms.

**Requested Assets:**
- `player-idle.png` - Player idle sprite sheet (32x48px per frame)
- `player-run.png` - Player running animation (sprite sheet)
- `player-jump.png` - Player jump sprite
- `platform-left.png` - Platform left edge (32x20px)
- `platform-middle.png` - Platform middle (tileable, 32x20px)
- `platform-right.png` - Platform right edge (32x20px)
- `coin.png` - Collectible coin sprite (24x24px, animated)
- `background-sky.png` - Parallax sky background (tileable)
- `background-clouds.png` - Floating clouds layer

---

## 4. Snake + Minesweeper (`/snake-minesweeper`)

**Hybrid Concept:** Snake navigates through a fog-of-war minesweeper grid.

**Requested Assets:**
- All Snake assets (see above)
- `fog-tile.png` - Fog of war overlay tile (40x40px)
- `revealed-tile.png` - Safe revealed tile (40x40px)
- `mine-tile.png` - Mine tile (revealed on death)
- `food-glow.png` - Food with subtle glow effect
- `number-overlay.png` - Numbers 1-8 for revealed cells

---

## 5. Snake + Platformer (`/snake-platformer`)

**Hybrid Concept:** A snake with physics - head and body follow your path through platforms.

**Requested Assets:**
- `snake-head-platformer.png` - Cuter/rounder snake head (24x24px)
- `snake-body-segment.png` - Round body segments (20x20px)
- `apple-shine.png` - Shiny collectible apple (24x24px)
- `goal-flag.png` - Victory flag sprite (48x64px)
- All Platformer platform assets
- `particle-trail.png` - Subtle particle for snake trail

---

## 6. Minesweeper + Platformer (`/minesweeper-platformer`)

**Hybrid Concept:** Platforms are minesweeper tiles - reveal numbers by standing on them.

**Requested Assets:**
- Player sprites (see Platformer)
- `platform-mystery.png` - Unrevealed platform with "?" (80x24px)
- `platform-safe-0.png` through `platform-safe-5.png` - Revealed platforms with numbers
- `platform-mine.png` - Mine platform (revealed on death)
- `heart.png` - Life/heart icon (24x24px)
- `explosion-small.png` - Small explosion for mine hit

---

## 7. Doodle God (`/doodle-god`)

**Current State:** Uses emojis for elements.

**Requested Assets:**

### Basic Elements (64x64px each)
- `element-fire.png` - Stylized fire icon
- `element-water.png` - Water droplet icon
- `element-earth.png` - Earth/dirt mound icon
- `element-air.png` - Wind/swirl icon

### Derived Elements (64x64px each, ~40 total)
- `element-steam.png`, `element-mud.png`, `element-lava.png`
- `element-stone.png`, `element-metal.png`, `element-sand.png`
- `element-glass.png`, `element-energy.png`, `element-storm.png`
- `element-lightning.png`, `element-rain.png`, `element-dust.png`
- `element-life.png`, `element-plant.png`, `element-tree.png`
- `element-wood.png`, `element-ash.png`, `element-coal.png`
- `element-swamp.png`, `element-bacteria.png`, `element-mushroom.png`
- `element-moss.png`, `element-algae.png`, `element-fish.png`
- `element-bird.png`, `element-egg.png`, `element-lizard.png`
- `element-beast.png`, `element-human.png`, `element-tool.png`
- `element-wheel.png`, `element-brick.png`, `element-house.png`
- `element-city.png`, `element-paper.png`, `element-book.png`
- `element-knowledge.png`, `element-electricity.png`, `element-computer.png`
- `element-internet.png`, `element-robot.png`, `element-time.png`
- `element-philosophy.png`, `element-love.png`, `element-music.png`
- `element-art.png`

### UI Elements
- `element-card-bg.png` - Card background for element display (90x60px)
- `combination-sparkle.png` - Sparkle effect for successful combinations
- `combination-fail.png` - Poof/smoke for failed combinations
- `discovery-glow.png` - Glow effect for new discoveries

---

## General UI Assets (All Games)

- `button-play.png` - Play/start button
- `button-restart.png` - Restart button
- `button-menu.png` - Menu button
- `game-over-overlay.png` - Semi-transparent game over background
- `victory-banner.png` - Victory celebration banner
- `font-pixel.ttf` - Pixel/retro font file (optional)

---

## Audio Assets (Optional Enhancement)

### Sound Effects
- `sfx-pickup.wav` - Collecting items
- `sfx-jump.wav` - Player jumping
- `sfx-death.wav` - Game over
- `sfx-win.wav` - Victory
- `sfx-reveal.wav` - Revealing tiles
- `sfx-flag.wav` - Placing flag
- `sfx-explosion.wav` - Mine explosion
- `sfx-combine.wav` - Element combination
- `sfx-discover.wav` - New element discovered

### Background Music
- `bgm-menu.mp3` - Menu music
- `bgm-gameplay.mp3` - General gameplay loop
- `bgm-intense.mp3` - For challenging moments

---

## Asset Guidelines

**Format:** PNG with transparency (for sprites), MP3/WAV (for audio)

**Style Suggestions:**
- Consistent pixel art style (16-bit or 32-bit aesthetic)
- OR clean vector/flat design
- Cohesive color palette across all games
- Consider dark theme compatibility (games use dark backgrounds)

**Delivery:**
Place all assets in `/public/assets/` organized by game:
```
public/
  assets/
    snake/
    minesweeper/
    platformer/
    snake-minesweeper/
    snake-platformer/
    minesweeper-platformer/
    doodle-god/
    ui/
    audio/
```

---

## Priority

1. **High Priority:** Snake, Minesweeper, Platformer (core games)
2. **Medium Priority:** Hybrid games (can reuse core game assets)
3. **Lower Priority:** Doodle God elements (emojis work as fallback)
4. **Optional:** Audio assets, UI polish

---

*Note: All games are fully playable with current graphics primitives. These assets would enhance visual polish but are not required for functionality.*

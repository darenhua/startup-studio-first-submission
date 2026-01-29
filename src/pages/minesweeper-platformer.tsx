import { useEffect, useRef } from 'react';
import Head from 'next/head';
import Phaser from 'phaser';

/**
 * MINESWEEPER + PLATFORMER HYBRID
 *
 * Concept: A platformer where platforms are minesweeper tiles! You can only see
 * the number (adjacent mines) of a tile when you're standing on it or adjacent to it.
 * Some platforms are mines - step on them and it's game over!
 *
 * - Each platform tile shows a number when revealed (adjacent mine platforms)
 * - Standing reveals the tile and adjacent tiles
 * - Use the numbers to deduce which platforms are safe
 * - Reach the goal without stepping on a mine!
 */

interface PlatformTile {
    x: number;
    y: number;
    width: number;
    isMine: boolean;
    isRevealed: boolean;
    adjacentMines: number;
    row: number;
    col: number;
}

class MinesweeperPlatformerScene extends Phaser.Scene {
    private player!: { x: number; y: number; vx: number; vy: number };
    private platforms: PlatformTile[] = [];
    private platformGrid: (PlatformTile | null)[][] = [];
    private graphics!: Phaser.GameObjects.Graphics;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private isGrounded = false;
    private currentPlatform: PlatformTile | null = null;
    private gameOver = false;
    private won = false;
    private goal!: { x: number; y: number };
    private lives = 3;
    private livesText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;

    private readonly GRAVITY = 1000;
    private readonly JUMP_FORCE = -500;
    private readonly MOVE_SPEED = 280;
    private readonly PLAYER_WIDTH = 28;
    private readonly PLAYER_HEIGHT = 40;
    private readonly TILE_WIDTH = 80;
    private readonly TILE_HEIGHT = 24;
    private readonly COLS = 10;
    private readonly ROWS = 15;

    constructor() {
        super('MinesweeperPlatformer');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x1a1a2e);

        this.graphics = this.add.graphics();
        this.gameOver = false;
        this.won = false;
        this.lives = 3;
        this.isGrounded = false;
        this.currentPlatform = null;

        // Initialize player
        this.player = { x: 100, y: 650, vx: 0, vy: 0 };

        // Generate level
        this.generateLevel();

        // Input
        this.cursors = this.input.keyboard!.createCursorKeys();

        // UI
        this.livesText = this.add.text(16, 16, '❤️❤️❤️', {
            fontSize: '24px',
            color: '#e74c3c'
        }).setScrollFactor(0);

        this.levelText = this.add.text(16, 50, 'Use numbers to find safe platforms. Reach the flag!', {
            fontSize: '14px',
            color: '#95a5a6'
        }).setScrollFactor(0);

        this.add.text(16, 75, '? = Unknown | Numbers = Adjacent mines', {
            fontSize: '12px',
            color: '#7f8c8d'
        }).setScrollFactor(0);
    }

    private generateLevel() {
        this.platforms = [];
        this.platformGrid = [];

        // Initialize grid
        for (let row = 0; row < this.ROWS; row++) {
            this.platformGrid[row] = [];
            for (let col = 0; col < this.COLS; col++) {
                this.platformGrid[row][col] = null;
            }
        }

        // Ground platform (always safe)
        const groundY = 700;
        for (let col = 0; col < this.COLS; col++) {
            const tile: PlatformTile = {
                x: col * this.TILE_WIDTH + this.TILE_WIDTH / 2 + 112,
                y: groundY,
                width: this.TILE_WIDTH - 4,
                isMine: false,
                isRevealed: true,
                adjacentMines: 0,
                row: this.ROWS - 1,
                col: col
            };
            this.platforms.push(tile);
            this.platformGrid[this.ROWS - 1][col] = tile;
        }

        // Generate platforms going up
        const mineChance = 0.25;

        for (let row = this.ROWS - 2; row >= 0; row--) {
            const y = groundY - (this.ROWS - 1 - row) * 60;

            // Random platforms per row (not all tiles)
            const platformsInRow = Phaser.Math.Between(4, 7);
            const usedCols = new Set<number>();

            for (let i = 0; i < platformsInRow; i++) {
                let col: number;
                let attempts = 0;
                do {
                    col = Phaser.Math.Between(0, this.COLS - 1);
                    attempts++;
                } while (usedCols.has(col) && attempts < 20);

                if (usedCols.has(col)) continue;
                usedCols.add(col);

                const isMine = Math.random() < mineChance && row > 0; // Top row safe for goal

                const tile: PlatformTile = {
                    x: col * this.TILE_WIDTH + this.TILE_WIDTH / 2 + 112,
                    y: y,
                    width: this.TILE_WIDTH - 4,
                    isMine: isMine,
                    isRevealed: false,
                    adjacentMines: 0,
                    row: row,
                    col: col
                };
                this.platforms.push(tile);
                this.platformGrid[row][col] = tile;
            }
        }

        // Calculate adjacent mines for each platform
        for (const tile of this.platforms) {
            if (!tile.isMine) {
                tile.adjacentMines = this.countAdjacentMines(tile.row, tile.col);
            }
        }

        // Place goal on top row
        const topPlatforms = this.platforms.filter(p => p.row === 0);
        if (topPlatforms.length > 0) {
            const goalPlatform = topPlatforms[Math.floor(Math.random() * topPlatforms.length)];
            goalPlatform.isMine = false; // Ensure goal platform is safe
            goalPlatform.adjacentMines = this.countAdjacentMines(goalPlatform.row, goalPlatform.col);
            this.goal = { x: goalPlatform.x, y: goalPlatform.y - 50 };
        } else {
            this.goal = { x: 512, y: 100 };
        }
    }

    private countAdjacentMines(row: number, col: number): number {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -2; dc <= 2; dc++) { // Check wider range horizontally
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
                    const neighbor = this.platformGrid[nr][nc];
                    if (neighbor && neighbor.isMine) count++;
                }
            }
        }
        return count;
    }

    private revealAround(row: number, col: number) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
                    const neighbor = this.platformGrid[nr][nc];
                    if (neighbor && !neighbor.isMine) {
                        neighbor.isRevealed = true;
                    }
                }
            }
        }
    }

    update(_time: number, delta: number) {
        if (this.gameOver) {
            if (this.cursors.space?.isDown) {
                this.scene.restart();
            }
            this.draw();
            return;
        }

        const dt = delta / 1000;

        // Horizontal movement
        if (this.cursors.left.isDown) {
            this.player.vx = -this.MOVE_SPEED;
        } else if (this.cursors.right.isDown) {
            this.player.vx = this.MOVE_SPEED;
        } else {
            this.player.vx *= 0.85;
        }

        // Jump
        if (this.cursors.up.isDown && this.isGrounded) {
            this.player.vy = this.JUMP_FORCE;
            this.isGrounded = false;
        }

        // Apply gravity
        this.player.vy += this.GRAVITY * dt;

        // Update position
        this.player.x += this.player.vx * dt;
        this.player.y += this.player.vy * dt;

        // Screen boundaries
        this.player.x = Phaser.Math.Clamp(this.player.x, this.PLAYER_WIDTH / 2, 1024 - this.PLAYER_WIDTH / 2);

        // Platform collision
        this.isGrounded = false;
        this.currentPlatform = null;

        for (const platform of this.platforms) {
            if (this.checkPlatformCollision(platform)) {
                this.player.y = platform.y - this.TILE_HEIGHT / 2 - this.PLAYER_HEIGHT / 2;
                this.player.vy = 0;
                this.isGrounded = true;
                this.currentPlatform = platform;

                // Check if stepping on mine
                if (platform.isMine && !platform.isRevealed) {
                    platform.isRevealed = true;
                    this.hitMine();
                } else {
                    // Reveal this and adjacent platforms
                    platform.isRevealed = true;
                    this.revealAround(platform.row, platform.col);
                }
            }
        }

        // Check goal
        const dx = this.player.x - this.goal.x;
        const dy = this.player.y - this.goal.y;
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
            this.endGame(true);
        }

        // Check if fell
        if (this.player.y > 800) {
            this.hitMine(); // Treat falling as losing a life
        }

        // Camera follows player
        const targetY = Math.min(0, this.player.y - 400);
        this.cameras.main.scrollY += (targetY - this.cameras.main.scrollY) * 0.1;

        this.draw();
    }

    private checkPlatformCollision(platform: PlatformTile): boolean {
        if (this.player.vy <= 0) return false;

        const playerBottom = this.player.y + this.PLAYER_HEIGHT / 2;
        const playerLeft = this.player.x - this.PLAYER_WIDTH / 2;
        const playerRight = this.player.x + this.PLAYER_WIDTH / 2;

        const platTop = platform.y - this.TILE_HEIGHT / 2;
        const platLeft = platform.x - platform.width / 2;
        const platRight = platform.x + platform.width / 2;

        const verticalHit = playerBottom >= platTop && playerBottom <= platTop + 25;
        const horizontalHit = playerRight > platLeft && playerLeft < platRight;

        return verticalHit && horizontalHit;
    }

    private hitMine() {
        this.lives--;
        this.updateLivesDisplay();

        if (this.lives <= 0) {
            this.endGame(false);
        } else {
            // Respawn at bottom
            this.player.x = 100;
            this.player.y = 650;
            this.player.vx = 0;
            this.player.vy = 0;
            this.cameras.main.scrollY = 0;
        }
    }

    private updateLivesDisplay() {
        const hearts = '❤️'.repeat(this.lives) + '🖤'.repeat(3 - this.lives);
        this.livesText.setText(hearts);
    }

    private draw() {
        this.graphics.clear();

        const numberColors: { [key: number]: number } = {
            0: 0x95a5a6,
            1: 0x3498db,
            2: 0x27ae60,
            3: 0xe74c3c,
            4: 0x9b59b6,
            5: 0xe67e22
        };

        // Draw platforms
        for (const platform of this.platforms) {
            if (platform.isRevealed) {
                if (platform.isMine) {
                    // Mine platform
                    this.graphics.fillStyle(0xe74c3c, 1);
                    this.graphics.fillRect(
                        platform.x - platform.width / 2,
                        platform.y - this.TILE_HEIGHT / 2,
                        platform.width,
                        this.TILE_HEIGHT
                    );
                    // Mine symbol
                    this.graphics.fillStyle(0x2c3e50, 1);
                    this.graphics.fillCircle(platform.x, platform.y, 8);
                } else {
                    // Safe platform - color by number
                    const color = numberColors[Math.min(platform.adjacentMines, 5)] || 0x27ae60;
                    this.graphics.fillStyle(color, 1);
                    this.graphics.fillRect(
                        platform.x - platform.width / 2,
                        platform.y - this.TILE_HEIGHT / 2,
                        platform.width,
                        this.TILE_HEIGHT
                    );

                    // Draw number
                    if (platform.adjacentMines > 0) {
                        this.add.text(platform.x, platform.y, platform.adjacentMines.toString(), {
                            fontSize: '18px',
                            color: '#ffffff',
                            fontStyle: 'bold'
                        }).setOrigin(0.5);
                    }
                }
            } else {
                // Unrevealed platform
                this.graphics.fillStyle(0x636e72, 1);
                this.graphics.fillRect(
                    platform.x - platform.width / 2,
                    platform.y - this.TILE_HEIGHT / 2,
                    platform.width,
                    this.TILE_HEIGHT
                );
                // Question mark
                this.add.text(platform.x, platform.y, '?', {
                    fontSize: '16px',
                    color: '#b2bec3'
                }).setOrigin(0.5);
            }
        }

        // Draw goal flag
        this.graphics.fillStyle(0xf1c40f, 1);
        this.graphics.fillRect(this.goal.x - 3, this.goal.y - 40, 6, 50);
        this.graphics.fillStyle(0x2ecc71, 1);
        this.graphics.fillTriangle(
            this.goal.x + 3, this.goal.y - 40,
            this.goal.x + 3, this.goal.y - 15,
            this.goal.x + 35, this.goal.y - 27
        );

        // Draw player
        this.graphics.fillStyle(0x3498db, 1);
        this.graphics.fillRect(
            this.player.x - this.PLAYER_WIDTH / 2,
            this.player.y - this.PLAYER_HEIGHT / 2,
            this.PLAYER_WIDTH,
            this.PLAYER_HEIGHT
        );
        // Player face
        this.graphics.fillStyle(0xffeaa7, 1);
        this.graphics.fillCircle(this.player.x, this.player.y - 10, 10);
        // Eyes
        this.graphics.fillStyle(0x2c3e50, 1);
        this.graphics.fillCircle(this.player.x - 4, this.player.y - 12, 2);
        this.graphics.fillCircle(this.player.x + 4, this.player.y - 12, 2);
    }

    private endGame(won: boolean) {
        this.gameOver = true;
        this.won = won;

        // Reveal all mines
        for (const platform of this.platforms) {
            if (platform.isMine) {
                platform.isRevealed = true;
            }
        }

        this.draw();

        const centerY = this.cameras.main.scrollY + 384;
        const title = won ? 'YOU WIN!' : 'GAME OVER';
        const color = won ? '#2ecc71' : '#e74c3c';

        this.add.text(512, centerY, title, {
            fontSize: '64px',
            color: color
        }).setOrigin(0.5);

        this.add.text(512, centerY + 70, 'Press SPACE to restart', {
            fontSize: '24px',
            color: '#95a5a6'
        }).setOrigin(0.5);
    }
}

export default function MinesweeperPlatformerPage() {
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && !gameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: 1024,
                height: 768,
                parent: 'game-container',
                backgroundColor: '#1a1a2e',
                scene: [MinesweeperPlatformerScene]
            };

            gameRef.current = new Phaser.Game(config);
        }

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    return (
        <>
            <Head>
                <title>Minesweeper + Platformer</title>
            </Head>
            <main style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                backgroundColor: '#0a0a0a'
            }}>
                <div id="game-container" />
            </main>
        </>
    );
}

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Phaser from 'phaser';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, Trophy, Heart, Flag } from 'lucide-react';

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
    private onLivesUpdate?: (lives: number) => void;
    private onGameEnd?: (won: boolean) => void;

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

    init(data: { onLivesUpdate?: (lives: number) => void; onGameEnd?: (won: boolean) => void }) {
        this.onLivesUpdate = data.onLivesUpdate;
        this.onGameEnd = data.onGameEnd;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x000000);

        this.graphics = this.add.graphics();
        this.gameOver = false;
        this.won = false;
        this.lives = 3;
        this.isGrounded = false;
        this.currentPlatform = null;

        this.player = { x: 100, y: 650, vx: 0, vy: 0 };
        this.generateLevel();
        this.cursors = this.input.keyboard!.createCursorKeys();
    }

    private generateLevel() {
        this.platforms = [];
        this.platformGrid = [];

        for (let row = 0; row < this.ROWS; row++) {
            this.platformGrid[row] = [];
            for (let col = 0; col < this.COLS; col++) {
                this.platformGrid[row][col] = null;
            }
        }

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

        const mineChance = 0.25;

        for (let row = this.ROWS - 2; row >= 0; row--) {
            const y = groundY - (this.ROWS - 1 - row) * 60;
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

                const isMine = Math.random() < mineChance && row > 0;

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

        for (const tile of this.platforms) {
            if (!tile.isMine) {
                tile.adjacentMines = this.countAdjacentMines(tile.row, tile.col);
            }
        }

        const topPlatforms = this.platforms.filter(p => p.row === 0);
        if (topPlatforms.length > 0) {
            const goalPlatform = topPlatforms[Math.floor(Math.random() * topPlatforms.length)];
            goalPlatform.isMine = false;
            goalPlatform.adjacentMines = this.countAdjacentMines(goalPlatform.row, goalPlatform.col);
            this.goal = { x: goalPlatform.x, y: goalPlatform.y - 50 };
        } else {
            this.goal = { x: 512, y: 100 };
        }
    }

    private countAdjacentMines(row: number, col: number): number {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
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

        if (this.cursors.left.isDown) {
            this.player.vx = -this.MOVE_SPEED;
        } else if (this.cursors.right.isDown) {
            this.player.vx = this.MOVE_SPEED;
        } else {
            this.player.vx *= 0.85;
        }

        if (this.cursors.up.isDown && this.isGrounded) {
            this.player.vy = this.JUMP_FORCE;
            this.isGrounded = false;
        }

        this.player.vy += this.GRAVITY * dt;
        this.player.x += this.player.vx * dt;
        this.player.y += this.player.vy * dt;

        this.player.x = Phaser.Math.Clamp(this.player.x, this.PLAYER_WIDTH / 2, 1024 - this.PLAYER_WIDTH / 2);

        this.isGrounded = false;
        this.currentPlatform = null;

        for (const platform of this.platforms) {
            if (this.checkPlatformCollision(platform)) {
                this.player.y = platform.y - this.TILE_HEIGHT / 2 - this.PLAYER_HEIGHT / 2;
                this.player.vy = 0;
                this.isGrounded = true;
                this.currentPlatform = platform;

                if (platform.isMine && !platform.isRevealed) {
                    platform.isRevealed = true;
                    this.hitMine();
                } else {
                    platform.isRevealed = true;
                    this.revealAround(platform.row, platform.col);
                }
            }
        }

        const dx = this.player.x - this.goal.x;
        const dy = this.player.y - this.goal.y;
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
            this.endGame(true);
        }

        if (this.player.y > 800) {
            this.hitMine();
        }

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
        this.onLivesUpdate?.(this.lives);

        if (this.lives <= 0) {
            this.endGame(false);
        } else {
            this.player.x = 100;
            this.player.y = 650;
            this.player.vx = 0;
            this.player.vy = 0;
            this.cameras.main.scrollY = 0;
        }
    }

    private draw() {
        this.graphics.clear();

        const numberColors: { [key: number]: number } = {
            0: 0x6b7280,
            1: 0x06b6d4,
            2: 0x10b981,
            3: 0xf59e0b,
            4: 0x8b5cf6,
            5: 0xef4444
        };

        for (const platform of this.platforms) {
            if (platform.isRevealed) {
                if (platform.isMine) {
                    this.graphics.fillStyle(0xef4444, 1);
                    this.graphics.fillRoundedRect(
                        platform.x - platform.width / 2,
                        platform.y - this.TILE_HEIGHT / 2,
                        platform.width,
                        this.TILE_HEIGHT,
                        4
                    );
                    this.graphics.fillStyle(0x000000, 1);
                    this.graphics.fillCircle(platform.x, platform.y, 8);
                } else {
                    const color = numberColors[Math.min(platform.adjacentMines, 5)] || 0x10b981;
                    this.graphics.fillStyle(color, 1);
                    this.graphics.fillRoundedRect(
                        platform.x - platform.width / 2,
                        platform.y - this.TILE_HEIGHT / 2,
                        platform.width,
                        this.TILE_HEIGHT,
                        4
                    );

                    if (platform.adjacentMines > 0) {
                        this.add.text(platform.x, platform.y, platform.adjacentMines.toString(), {
                            fontSize: '16px',
                            color: '#ffffff',
                            fontStyle: 'bold'
                        }).setOrigin(0.5);
                    }
                }
            } else {
                this.graphics.fillStyle(0x262626, 1);
                this.graphics.fillRoundedRect(
                    platform.x - platform.width / 2,
                    platform.y - this.TILE_HEIGHT / 2,
                    platform.width,
                    this.TILE_HEIGHT,
                    4
                );
                this.add.text(platform.x, platform.y, '?', {
                    fontSize: '14px',
                    color: '#666666'
                }).setOrigin(0.5);
            }
        }

        // Draw goal flag
        this.graphics.fillStyle(0xffffff, 1);
        this.graphics.fillRect(this.goal.x - 3, this.goal.y - 40, 6, 50);
        this.graphics.fillStyle(0x10b981, 1);
        this.graphics.fillTriangle(
            this.goal.x + 3, this.goal.y - 40,
            this.goal.x + 3, this.goal.y - 15,
            this.goal.x + 35, this.goal.y - 27
        );

        // Draw player - white square with face
        this.graphics.fillStyle(0xffffff, 1);
        this.graphics.fillRoundedRect(
            this.player.x - this.PLAYER_WIDTH / 2,
            this.player.y - this.PLAYER_HEIGHT / 2,
            this.PLAYER_WIDTH,
            this.PLAYER_HEIGHT,
            4
        );
        // Eyes
        this.graphics.fillStyle(0x000000, 1);
        this.graphics.fillCircle(this.player.x - 5, this.player.y - 8, 3);
        this.graphics.fillCircle(this.player.x + 5, this.player.y - 8, 3);
    }

    private endGame(won: boolean) {
        this.gameOver = true;
        this.won = won;

        for (const platform of this.platforms) {
            if (platform.isMine) {
                platform.isRevealed = true;
            }
        }

        this.draw();
        this.onGameEnd?.(won);
    }
}

export default function MinesweeperPlatformerPage() {
    const gameRef = useRef<Phaser.Game | null>(null);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && !gameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: 1024,
                height: 768,
                parent: 'game-container',
                backgroundColor: '#000000',
                scene: [MinesweeperPlatformerScene]
            };

            gameRef.current = new Phaser.Game(config);

            gameRef.current.events.once('ready', () => {
                const scene = gameRef.current?.scene.getScene('MinesweeperPlatformer') as MinesweeperPlatformerScene;
                scene?.scene.restart({
                    onLivesUpdate: (l: number) => setLives(l),
                    onGameEnd: (w: boolean) => {
                        setGameOver(true);
                        setWon(w);
                    }
                });
            });
        }

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    const handleRestart = () => {
        setLives(3);
        setGameOver(false);
        setWon(false);
        const scene = gameRef.current?.scene.getScene('MinesweeperPlatformer') as MinesweeperPlatformerScene;
        scene?.scene.restart({
            onLivesUpdate: (l: number) => setLives(l),
            onGameEnd: (w: boolean) => {
                setGameOver(true);
                setWon(w);
            }
        });
    };

    return (
        <>
            <Head>
                <title>Minesweeper + Platformer | Game Arcade</title>
                <meta name="description" content="Jump on minesweeper platforms" />
            </Head>

            <div className="dark min-h-screen bg-black text-white">
                <motion.nav
                    className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/final" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                                <ArrowLeft className="w-4 h-4" />
                                <span className="text-sm">Back</span>
                            </Link>
                            <div className="h-4 w-px bg-white/20" />
                            <h1 className="text-lg font-semibold">Minesweeper + Platformer</h1>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-white/60">
                                <Heart className="w-4 h-4 text-red-500" />
                                <span className="text-sm font-medium">
                                    {'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-white/60">
                                <Flag className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm">Reach the flag!</span>
                            </div>
                        </div>
                    </div>
                </motion.nav>

                <main className="flex flex-col items-center justify-center py-8">
                    <motion.div
                        className="relative"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div
                            id="game-container"
                            className="rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-white/5"
                        />

                        {gameOver && (
                            <motion.div
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                                    className="text-center"
                                >
                                    <h2 className={`text-4xl font-bold mb-4 ${won ? 'text-emerald-400' : 'text-white'}`}>
                                        {won ? 'You Win!' : 'Game Over'}
                                    </h2>
                                    <button
                                        onClick={handleRestart}
                                        className="flex items-center gap-2 mx-auto px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Play Again
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </motion.div>

                    <motion.p
                        className="mt-6 text-white/40 text-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">←</kbd> <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">→</kbd> to move · <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">↑</kbd> to jump · Use numbers to avoid mines!
                    </motion.p>
                </main>
            </div>
        </>
    );
}

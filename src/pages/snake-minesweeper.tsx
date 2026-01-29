import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Phaser from 'phaser';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, Trophy, Bomb, Apple } from 'lucide-react';

interface Cell {
    isMine: boolean;
    isRevealed: boolean;
    adjacentMines: number;
    hasFood: boolean;
}

class SnakeMinesweeperScene extends Phaser.Scene {
    private snake: { x: number; y: number }[] = [];
    private grid: Cell[][] = [];
    private gridSize = 15;
    private tileSize = 40;
    private mineCount = 25;
    private foodCount = 10;
    private foodEaten = 0;
    private direction: { x: number; y: number } = { x: 1, y: 0 };
    private nextDirection: { x: number; y: number } = { x: 1, y: 0 };
    private moveTimer = 0;
    private moveDelay = 200;
    private gameOver = false;
    private won = false;
    private graphics!: Phaser.GameObjects.Graphics;
    private revealedCells: Set<string> = new Set();
    private onFoodUpdate?: (eaten: number, total: number) => void;
    private onGameEnd?: (won: boolean, score: number) => void;

    constructor() {
        super('SnakeMinesweeper');
    }

    init(data: { onFoodUpdate?: (eaten: number, total: number) => void; onGameEnd?: (won: boolean, score: number) => void }) {
        this.onFoodUpdate = data.onFoodUpdate;
        this.onGameEnd = data.onGameEnd;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x000000);

        this.graphics = this.add.graphics();
        this.gameOver = false;
        this.won = false;
        this.foodEaten = 0;
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.moveTimer = 0;
        this.revealedCells = new Set();

        this.initGrid();

        const centerX = Math.floor(this.gridSize / 2);
        const centerY = Math.floor(this.gridSize / 2);
        this.snake = [
            { x: centerX, y: centerY },
            { x: centerX - 1, y: centerY },
            { x: centerX - 2, y: centerY }
        ];

        this.placeMines(centerX, centerY);
        this.placeFood();
        this.revealAroundSnake();

        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if (this.gameOver) {
                if (event.code === 'Space') {
                    this.scene.restart();
                }
                return;
            }

            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    if (this.direction.y !== 1) this.nextDirection = { x: 0, y: -1 };
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    if (this.direction.y !== -1) this.nextDirection = { x: 0, y: 1 };
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    if (this.direction.x !== 1) this.nextDirection = { x: -1, y: 0 };
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    if (this.direction.x !== -1) this.nextDirection = { x: 1, y: 0 };
                    break;
            }
        });

        this.draw();
    }

    private initGrid() {
        this.grid = [];
        for (let y = 0; y < this.gridSize; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                this.grid[y][x] = {
                    isMine: false,
                    isRevealed: false,
                    adjacentMines: 0,
                    hasFood: false
                };
            }
        }
    }

    private placeMines(safeX: number, safeY: number) {
        let placed = 0;
        while (placed < this.mineCount) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const isSafe = Math.abs(x - safeX) <= 2 && Math.abs(y - safeY) <= 2;

            if (!this.grid[y][x].isMine && !isSafe) {
                this.grid[y][x].isMine = true;
                placed++;
            }
        }

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (!this.grid[y][x].isMine) {
                    this.grid[y][x].adjacentMines = this.countAdjacentMines(x, y);
                }
            }
        }
    }

    private countAdjacentMines(x: number, y: number): number {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    if (this.grid[ny][nx].isMine) count++;
                }
            }
        }
        return count;
    }

    private placeFood() {
        let placed = 0;
        while (placed < this.foodCount) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);

            if (!this.grid[y][x].isMine && !this.grid[y][x].hasFood) {
                let onSnake = false;
                for (const seg of this.snake) {
                    if (seg.x === x && seg.y === y) {
                        onSnake = true;
                        break;
                    }
                }
                if (!onSnake) {
                    this.grid[y][x].hasFood = true;
                    placed++;
                }
            }
        }
    }

    private revealAroundSnake() {
        const head = this.snake[0];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = head.x + dx;
                const ny = head.y + dy;
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    this.grid[ny][nx].isRevealed = true;
                    this.revealedCells.add(`${nx},${ny}`);
                }
            }
        }
    }

    update() {
        if (this.gameOver) return;

        this.moveTimer += this.game.loop.delta;

        if (this.moveTimer >= this.moveDelay) {
            this.moveTimer = 0;
            this.direction = { ...this.nextDirection };
            this.moveSnake();
            this.draw();
        }
    }

    private moveSnake() {
        const head = this.snake[0];
        const newHead = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y
        };

        if (newHead.x < 0 || newHead.x >= this.gridSize ||
            newHead.y < 0 || newHead.y >= this.gridSize) {
            this.endGame(false);
            return;
        }

        for (const segment of this.snake) {
            if (segment.x === newHead.x && segment.y === newHead.y) {
                this.endGame(false);
                return;
            }
        }

        if (this.grid[newHead.y][newHead.x].isMine) {
            this.endGame(false);
            return;
        }

        this.snake.unshift(newHead);
        this.revealAroundSnake();

        if (this.grid[newHead.y][newHead.x].hasFood) {
            this.grid[newHead.y][newHead.x].hasFood = false;
            this.foodEaten++;
            this.onFoodUpdate?.(this.foodEaten, this.foodCount);

            if (this.foodEaten >= this.foodCount) {
                this.endGame(true);
                return;
            }
        } else {
            this.snake.pop();
        }
    }

    private draw() {
        this.graphics.clear();

        const offsetX = (1024 - this.gridSize * this.tileSize) / 2;
        const offsetY = (768 - this.gridSize * this.tileSize) / 2;

        const numberColors: { [key: number]: string } = {
            1: '#06b6d4',
            2: '#10b981',
            3: '#f59e0b',
            4: '#8b5cf6',
            5: '#ef4444',
            6: '#14b8a6',
            7: '#ffffff',
            8: '#6b7280'
        };

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                const px = offsetX + x * this.tileSize;
                const py = offsetY + y * this.tileSize;

                if (cell.isRevealed) {
                    if (cell.isMine && this.gameOver) {
                        this.graphics.fillStyle(0xef4444, 1);
                        this.graphics.fillRoundedRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4, 4);
                        this.graphics.fillStyle(0x000000, 1);
                        this.graphics.fillCircle(px + this.tileSize / 2, py + this.tileSize / 2, 8);
                    } else {
                        this.graphics.fillStyle(0x1a1a1a, 1);
                        this.graphics.fillRoundedRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4, 4);

                        if (cell.adjacentMines > 0) {
                            const color = numberColors[cell.adjacentMines] || '#ffffff';
                            this.add.text(px + this.tileSize / 2, py + this.tileSize / 2,
                                cell.adjacentMines.toString(), {
                                    fontSize: '18px',
                                    color: color,
                                    fontStyle: 'bold'
                                }).setOrigin(0.5);
                        }

                        if (cell.hasFood) {
                            this.graphics.fillStyle(0x10b981, 1);
                            this.graphics.fillCircle(px + this.tileSize / 2, py + this.tileSize / 2, 8);
                        }
                    }
                } else {
                    this.graphics.fillStyle(0x0a0a0a, 1);
                    this.graphics.fillRoundedRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4, 4);
                    this.graphics.lineStyle(1, 0x1a1a1a, 1);
                    this.graphics.strokeRoundedRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4, 4);
                }
            }
        }

        // Draw snake
        this.snake.forEach((segment, index) => {
            const px = offsetX + segment.x * this.tileSize;
            const py = offsetY + segment.y * this.tileSize;
            const isHead = index === 0;
            const alpha = 1 - (index * 0.02);

            this.graphics.fillStyle(isHead ? 0xffffff : 0xe5e5e5, Math.max(0.5, alpha));
            this.graphics.fillRoundedRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8, isHead ? 8 : 4);
        });

        // Grid border
        this.graphics.lineStyle(2, 0x333333, 1);
        this.graphics.strokeRoundedRect(offsetX - 2, offsetY - 2, this.gridSize * this.tileSize + 4, this.gridSize * this.tileSize + 4, 8);
    }

    private endGame(won: boolean) {
        this.gameOver = true;
        this.won = won;

        if (!won) {
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    if (this.grid[y][x].isMine) {
                        this.grid[y][x].isRevealed = true;
                    }
                }
            }
        }

        this.draw();
        this.onGameEnd?.(won, this.foodEaten);
    }
}

export default function SnakeMinesweeperPage() {
    const gameRef = useRef<Phaser.Game | null>(null);
    const [foodEaten, setFoodEaten] = useState(0);
    const [foodTotal] = useState(10);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [highScore, setHighScore] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem('snake-minesweeper-high-score');
        if (saved) setHighScore(parseInt(saved));
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && !gameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: 1024,
                height: 768,
                parent: 'game-container',
                backgroundColor: '#000000',
                scene: [SnakeMinesweeperScene]
            };

            gameRef.current = new Phaser.Game(config);

            gameRef.current.events.once('ready', () => {
                const scene = gameRef.current?.scene.getScene('SnakeMinesweeper') as SnakeMinesweeperScene;
                scene?.scene.restart({
                    onFoodUpdate: (eaten: number, total: number) => setFoodEaten(eaten),
                    onGameEnd: (w: boolean, score: number) => {
                        setGameOver(true);
                        setWon(w);
                        if (score > highScore) {
                            setHighScore(score);
                            localStorage.setItem('snake-minesweeper-high-score', score.toString());
                        }
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
    }, [highScore]);

    const handleRestart = () => {
        setFoodEaten(0);
        setGameOver(false);
        setWon(false);
        const scene = gameRef.current?.scene.getScene('SnakeMinesweeper') as SnakeMinesweeperScene;
        scene?.scene.restart({
            onFoodUpdate: (eaten: number, total: number) => setFoodEaten(eaten),
            onGameEnd: (w: boolean, score: number) => {
                setGameOver(true);
                setWon(w);
                if (score > highScore) {
                    setHighScore(score);
                    localStorage.setItem('snake-minesweeper-high-score', score.toString());
                }
            }
        });
    };

    return (
        <>
            <Head>
                <title>Snake + Minesweeper | Game Arcade</title>
                <meta name="description" content="Navigate a minesweeper grid as a snake" />
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
                            <h1 className="text-lg font-semibold">Snake + Minesweeper</h1>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-white/60">
                                <Apple className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm font-medium">{foodEaten} / {foodTotal}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/60">
                                <Bomb className="w-4 h-4 text-red-500" />
                                <span className="text-sm font-medium">25</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/60">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-medium">{highScore}</span>
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
                                    <h2 className={`text-4xl font-bold mb-2 ${won ? 'text-emerald-400' : 'text-white'}`}>
                                        {won ? 'You Win!' : 'Game Over'}
                                    </h2>
                                    <p className="text-white/60 text-lg mb-6">Food collected: {foodEaten}</p>
                                    {foodEaten === highScore && foodEaten > 0 && (
                                        <p className="text-emerald-400 text-sm mb-4">New High Score!</p>
                                    )}
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
                        Use <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Arrow Keys</kbd> to navigate · Avoid mines using numbers
                    </motion.p>
                </main>
            </div>
        </>
    );
}

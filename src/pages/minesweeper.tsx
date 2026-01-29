import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Phaser from 'phaser';
import { motion } from 'framer-motion';
import { ArrowLeft, Flag, Bomb, RotateCcw, Trophy, Timer } from 'lucide-react';

interface Cell {
    x: number;
    y: number;
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    adjacentMines: number;
}

class MinesweeperScene extends Phaser.Scene {
    private grid: Cell[][] = [];
    private gridWidth = 16;
    private gridHeight = 12;
    private mineCount = 30;
    private tileSize = 40;
    private graphics!: Phaser.GameObjects.Graphics;
    private gameOver = false;
    private won = false;
    private firstClick = true;
    private flagsPlaced = 0;
    private startTime = 0;
    private onFlagsUpdate?: (flags: number) => void;
    private onGameEnd?: (won: boolean, time: number) => void;
    private onTimeUpdate?: (time: number) => void;

    constructor() {
        super('Minesweeper');
    }

    init(data: { onFlagsUpdate?: (flags: number) => void; onGameEnd?: (won: boolean, time: number) => void; onTimeUpdate?: (time: number) => void }) {
        this.onFlagsUpdate = data.onFlagsUpdate;
        this.onGameEnd = data.onGameEnd;
        this.onTimeUpdate = data.onTimeUpdate;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x000000);

        this.graphics = this.add.graphics();
        this.gameOver = false;
        this.won = false;
        this.firstClick = true;
        this.flagsPlaced = 0;
        this.startTime = 0;

        this.initGrid();

        // Input handling
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.gameOver) {
                if (pointer.leftButtonDown()) {
                    this.scene.restart();
                }
                return;
            }

            const offsetX = (1024 - this.gridWidth * this.tileSize) / 2;
            const offsetY = (768 - this.gridHeight * this.tileSize) / 2;

            const gridX = Math.floor((pointer.x - offsetX) / this.tileSize);
            const gridY = Math.floor((pointer.y - offsetY) / this.tileSize);

            if (gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridHeight) {
                if (pointer.rightButtonDown()) {
                    this.toggleFlag(gridX, gridY);
                } else if (pointer.leftButtonDown()) {
                    if (this.firstClick) {
                        this.placeMines(gridX, gridY);
                        this.firstClick = false;
                        this.startTime = Date.now();
                    }
                    this.revealCell(gridX, gridY);
                }
                this.draw();
            }
        });

        // Prevent context menu
        this.input.mouse?.disableContextMenu();

        this.draw();
    }

    update() {
        if (!this.gameOver && !this.firstClick && this.startTime > 0) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.onTimeUpdate?.(elapsed);
        }
    }

    private initGrid() {
        this.grid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                this.grid[y][x] = {
                    x,
                    y,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    adjacentMines: 0
                };
            }
        }
    }

    private placeMines(safeX: number, safeY: number) {
        let minesPlaced = 0;
        while (minesPlaced < this.mineCount) {
            const x = Math.floor(Math.random() * this.gridWidth);
            const y = Math.floor(Math.random() * this.gridHeight);

            const isSafe = Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1;

            if (!this.grid[y][x].isMine && !isSafe) {
                this.grid[y][x].isMine = true;
                minesPlaced++;
            }
        }

        // Calculate adjacent mines
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
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
                if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
                    if (this.grid[ny][nx].isMine) count++;
                }
            }
        }
        return count;
    }

    private toggleFlag(x: number, y: number) {
        const cell = this.grid[y][x];
        if (!cell.isRevealed) {
            cell.isFlagged = !cell.isFlagged;
            this.flagsPlaced += cell.isFlagged ? 1 : -1;
            this.onFlagsUpdate?.(this.flagsPlaced);
        }
    }

    private revealCell(x: number, y: number) {
        const cell = this.grid[y][x];

        if (cell.isRevealed || cell.isFlagged) return;

        cell.isRevealed = true;

        if (cell.isMine) {
            this.endGame(false);
            return;
        }

        if (cell.adjacentMines === 0) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
                        this.revealCell(nx, ny);
                    }
                }
            }
        }

        this.checkWin();
    }

    private checkWin() {
        let unrevealedSafe = 0;
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (!this.grid[y][x].isRevealed && !this.grid[y][x].isMine) {
                    unrevealedSafe++;
                }
            }
        }
        if (unrevealedSafe === 0) {
            this.endGame(true);
        }
    }

    private endGame(won: boolean) {
        this.gameOver = true;
        this.won = won;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

        // Reveal all mines
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x].isMine) {
                    this.grid[y][x].isRevealed = true;
                }
            }
        }

        this.draw();
        this.onGameEnd?.(won, elapsed);
    }

    private draw() {
        this.graphics.clear();

        const offsetX = (1024 - this.gridWidth * this.tileSize) / 2;
        const offsetY = (768 - this.gridHeight * this.tileSize) / 2;

        // Number colors - modern palette
        const numberColors: { [key: number]: number } = {
            1: 0x06b6d4, // cyan
            2: 0x10b981, // emerald
            3: 0xf59e0b, // amber
            4: 0x8b5cf6, // violet
            5: 0xef4444, // red
            6: 0x14b8a6, // teal
            7: 0xffffff, // white
            8: 0x6b7280  // gray
        };

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const cell = this.grid[y][x];
                const px = offsetX + x * this.tileSize;
                const py = offsetY + y * this.tileSize;

                if (cell.isRevealed) {
                    if (cell.isMine) {
                        // Mine - red accent
                        this.graphics.fillStyle(0xef4444, 1);
                        this.graphics.fillRoundedRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4, 4);
                        // Mine circle
                        this.graphics.fillStyle(0x000000, 1);
                        this.graphics.fillCircle(px + this.tileSize / 2, py + this.tileSize / 2, 10);
                    } else {
                        // Revealed safe cell
                        this.graphics.fillStyle(0x1a1a1a, 1);
                        this.graphics.fillRoundedRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4, 4);

                        if (cell.adjacentMines > 0) {
                            const color = numberColors[cell.adjacentMines] || 0xffffff;
                            this.add.text(px + this.tileSize / 2, py + this.tileSize / 2,
                                cell.adjacentMines.toString(), {
                                    fontSize: '20px',
                                    color: '#' + color.toString(16).padStart(6, '0'),
                                    fontStyle: 'bold'
                                }).setOrigin(0.5);
                        }
                    }
                } else {
                    // Unrevealed cell
                    this.graphics.fillStyle(0x262626, 1);
                    this.graphics.fillRoundedRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4, 4);

                    // Subtle highlight
                    this.graphics.fillStyle(0x333333, 1);
                    this.graphics.fillRoundedRect(px + 2, py + 2, this.tileSize - 4, 4, { tl: 4, tr: 4, bl: 0, br: 0 });

                    if (cell.isFlagged) {
                        // Flag - emerald
                        this.graphics.fillStyle(0x10b981, 1);
                        this.graphics.fillTriangle(
                            px + 14, py + 10,
                            px + 14, py + 22,
                            px + 28, py + 16
                        );
                        this.graphics.fillStyle(0x666666, 1);
                        this.graphics.fillRect(px + 12, py + 10, 3, 22);
                    }
                }
            }
        }

        // Grid border
        this.graphics.lineStyle(2, 0x333333, 1);
        this.graphics.strokeRoundedRect(offsetX - 2, offsetY - 2, this.gridWidth * this.tileSize + 4, this.gridHeight * this.tileSize + 4, 8);
    }
}

export default function MinesweeperPage() {
    const gameRef = useRef<Phaser.Game | null>(null);
    const [flags, setFlags] = useState(0);
    const [time, setTime] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [bestTime, setBestTime] = useState<number | null>(null);

    const mineCount = 30;

    useEffect(() => {
        const saved = localStorage.getItem('minesweeper-best-time');
        if (saved) setBestTime(parseInt(saved));
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && !gameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: 1024,
                height: 768,
                parent: 'game-container',
                backgroundColor: '#000000',
                scene: [MinesweeperScene]
            };

            gameRef.current = new Phaser.Game(config);

            gameRef.current.events.once('ready', () => {
                const scene = gameRef.current?.scene.getScene('Minesweeper') as MinesweeperScene;
                scene?.scene.restart({
                    onFlagsUpdate: (f: number) => setFlags(f),
                    onTimeUpdate: (t: number) => setTime(t),
                    onGameEnd: (w: boolean, t: number) => {
                        setGameOver(true);
                        setWon(w);
                        if (w && (bestTime === null || t < bestTime)) {
                            setBestTime(t);
                            localStorage.setItem('minesweeper-best-time', t.toString());
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
    }, [bestTime]);

    const handleRestart = () => {
        setFlags(0);
        setTime(0);
        setGameOver(false);
        setWon(false);
        const scene = gameRef.current?.scene.getScene('Minesweeper') as MinesweeperScene;
        scene?.scene.restart({
            onFlagsUpdate: (f: number) => setFlags(f),
            onTimeUpdate: (t: number) => setTime(t),
            onGameEnd: (w: boolean, t: number) => {
                setGameOver(true);
                setWon(w);
                if (w && (bestTime === null || t < bestTime)) {
                    setBestTime(t);
                    localStorage.setItem('minesweeper-best-time', t.toString());
                }
            }
        });
    };

    return (
        <>
            <Head>
                <title>Minesweeper | Game Arcade</title>
                <meta name="description" content="Classic Minesweeper with modern minimalist design" />
            </Head>

            <div className="dark min-h-screen bg-black text-white">
                {/* Navigation */}
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
                            <h1 className="text-lg font-semibold">Minesweeper</h1>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-white/60">
                                <Bomb className="w-4 h-4 text-red-500" />
                                <span className="text-sm font-medium">{mineCount}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/60">
                                <Flag className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm font-medium">{flags}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/60">
                                <Timer className="w-4 h-4 text-cyan-500" />
                                <span className="text-sm font-medium">{time}s</span>
                            </div>
                            {bestTime !== null && (
                                <div className="flex items-center gap-2 text-white/60">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                    <span className="text-sm font-medium">{bestTime}s</span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.nav>

                {/* Game Container */}
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

                        {/* Game Over Overlay */}
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
                                    <p className="text-white/60 text-lg mb-6">Time: {time}s</p>
                                    {won && bestTime === time && (
                                        <p className="text-emerald-400 text-sm mb-4">New Best Time!</p>
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

                    {/* Controls hint */}
                    <motion.p
                        className="mt-6 text-white/40 text-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Left Click</kbd> to reveal · <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Right Click</kbd> to flag
                    </motion.p>
                </main>
            </div>
        </>
    );
}

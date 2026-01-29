import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Phaser from 'phaser';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, RotateCcw, Trophy, Zap } from 'lucide-react';

// Snake Game Scene with modern minimalist styling
class SnakeGameScene extends Phaser.Scene {
    private snake: { x: number; y: number }[] = [];
    private food: { x: number; y: number } = { x: 0, y: 0 };
    private direction: { x: number; y: number } = { x: 1, y: 0 };
    private nextDirection: { x: number; y: number } = { x: 1, y: 0 };
    private gridSize = 20;
    private tileSize = 32;
    private moveTimer = 0;
    private moveDelay = 150;
    private score = 0;
    private gameOver = false;
    private graphics!: Phaser.GameObjects.Graphics;
    private onScoreUpdate?: (score: number) => void;
    private onGameOver?: (score: number) => void;

    constructor() {
        super('SnakeGame');
    }

    init(data: { onScoreUpdate?: (score: number) => void; onGameOver?: (score: number) => void }) {
        this.onScoreUpdate = data.onScoreUpdate;
        this.onGameOver = data.onGameOver;
    }

    create() {
        // Pure black background
        this.cameras.main.setBackgroundColor(0x000000);

        // Initialize snake
        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.score = 0;
        this.gameOver = false;
        this.moveDelay = 150;

        // Create graphics object for drawing
        this.graphics = this.add.graphics();

        // Place initial food
        this.placeFood();

        // Input
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

    update(time: number) {
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

        // Check wall collision
        if (newHead.x < 0 || newHead.x >= this.gridSize ||
            newHead.y < 0 || newHead.y >= this.gridSize) {
            this.endGame();
            return;
        }

        // Check self collision
        for (const segment of this.snake) {
            if (segment.x === newHead.x && segment.y === newHead.y) {
                this.endGame();
                return;
            }
        }

        // Add new head
        this.snake.unshift(newHead);

        // Check food collision
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score += 10;
            this.onScoreUpdate?.(this.score);
            this.placeFood();
            // Increase speed slightly
            this.moveDelay = Math.max(50, this.moveDelay - 2);
        } else {
            // Remove tail if no food eaten
            this.snake.pop();
        }
    }

    private placeFood() {
        let valid = false;
        while (!valid) {
            this.food = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize)
            };
            valid = true;
            for (const segment of this.snake) {
                if (segment.x === this.food.x && segment.y === this.food.y) {
                    valid = false;
                    break;
                }
            }
        }
    }

    private draw() {
        this.graphics.clear();

        // Draw grid background
        const offsetX = (1024 - this.gridSize * this.tileSize) / 2;
        const offsetY = (768 - this.gridSize * this.tileSize) / 2;

        // Dark grid background
        this.graphics.fillStyle(0x0a0a0a, 1);
        this.graphics.fillRect(offsetX, offsetY, this.gridSize * this.tileSize, this.gridSize * this.tileSize);

        // Subtle grid lines
        this.graphics.lineStyle(1, 0x1a1a1a, 0.5);
        for (let i = 0; i <= this.gridSize; i++) {
            this.graphics.moveTo(offsetX + i * this.tileSize, offsetY);
            this.graphics.lineTo(offsetX + i * this.tileSize, offsetY + this.gridSize * this.tileSize);
            this.graphics.moveTo(offsetX, offsetY + i * this.tileSize);
            this.graphics.lineTo(offsetX + this.gridSize * this.tileSize, offsetY + i * this.tileSize);
        }
        this.graphics.strokePath();

        // Grid border with glow effect
        this.graphics.lineStyle(2, 0x333333, 1);
        this.graphics.strokeRect(offsetX, offsetY, this.gridSize * this.tileSize, this.gridSize * this.tileSize);

        // Draw food - emerald accent
        this.graphics.fillStyle(0x10b981, 1);
        this.graphics.fillRoundedRect(
            offsetX + this.food.x * this.tileSize + 4,
            offsetY + this.food.y * this.tileSize + 4,
            this.tileSize - 8,
            this.tileSize - 8,
            6
        );
        // Food glow
        this.graphics.lineStyle(2, 0x34d399, 0.5);
        this.graphics.strokeRoundedRect(
            offsetX + this.food.x * this.tileSize + 4,
            offsetY + this.food.y * this.tileSize + 4,
            this.tileSize - 8,
            this.tileSize - 8,
            6
        );

        // Draw snake
        this.snake.forEach((segment, index) => {
            const isHead = index === 0;
            // White snake with gradient from head to tail
            const alpha = 1 - (index * 0.02);
            const color = isHead ? 0xffffff : 0xe5e5e5;

            this.graphics.fillStyle(color, Math.max(0.4, alpha));
            this.graphics.fillRoundedRect(
                offsetX + segment.x * this.tileSize + 2,
                offsetY + segment.y * this.tileSize + 2,
                this.tileSize - 4,
                this.tileSize - 4,
                isHead ? 8 : 4
            );

            // Head glow
            if (isHead) {
                this.graphics.lineStyle(2, 0x666666, 0.5);
                this.graphics.strokeRoundedRect(
                    offsetX + segment.x * this.tileSize + 2,
                    offsetY + segment.y * this.tileSize + 2,
                    this.tileSize - 4,
                    this.tileSize - 4,
                    8
                );
            }
        });
    }

    private endGame() {
        this.gameOver = true;
        this.onGameOver?.(this.score);
    }
}

export default function SnakePage() {
    const gameRef = useRef<Phaser.Game | null>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [highScore, setHighScore] = useState(0);

    useEffect(() => {
        // Load high score from localStorage
        const saved = localStorage.getItem('snake-high-score');
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
                scene: [SnakeGameScene]
            };

            gameRef.current = new Phaser.Game(config);

            // Pass callbacks to scene
            gameRef.current.events.once('ready', () => {
                const scene = gameRef.current?.scene.getScene('SnakeGame') as SnakeGameScene;
                scene?.scene.restart({
                    onScoreUpdate: (newScore: number) => setScore(newScore),
                    onGameOver: (finalScore: number) => {
                        setGameOver(true);
                        if (finalScore > highScore) {
                            setHighScore(finalScore);
                            localStorage.setItem('snake-high-score', finalScore.toString());
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
        setScore(0);
        setGameOver(false);
        const scene = gameRef.current?.scene.getScene('SnakeGame') as SnakeGameScene;
        scene?.scene.restart({
            onScoreUpdate: (newScore: number) => setScore(newScore),
            onGameOver: (finalScore: number) => {
                setGameOver(true);
                if (finalScore > highScore) {
                    setHighScore(finalScore);
                    localStorage.setItem('snake-high-score', finalScore.toString());
                }
            }
        });
    };

    return (
        <>
            <Head>
                <title>Snake | Game Arcade</title>
                <meta name="description" content="Classic Snake game with modern minimalist design" />
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
                            <h1 className="text-lg font-semibold">Snake</h1>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-white/60">
                                <Zap className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm font-medium">{score}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/60">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-medium">{highScore}</span>
                            </div>
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
                        {/* Game canvas container */}
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
                                    <h2 className="text-4xl font-bold text-white mb-2">Game Over</h2>
                                    <p className="text-white/60 text-lg mb-6">Final Score: {score}</p>
                                    {score === highScore && score > 0 && (
                                        <p className="text-emerald-400 text-sm mb-4">🎉 New High Score!</p>
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
                        Use <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Arrow Keys</kbd> or <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">WASD</kbd> to move
                    </motion.p>
                </main>
            </div>
        </>
    );
}

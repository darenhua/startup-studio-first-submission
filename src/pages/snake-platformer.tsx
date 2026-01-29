import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Phaser from 'phaser';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, Trophy, Apple, Flag } from 'lucide-react';

interface BodySegment {
    x: number;
    y: number;
}

class SnakePlatformerScene extends Phaser.Scene {
    private head!: { x: number; y: number; vx: number; vy: number };
    private body: BodySegment[] = [];
    private pathHistory: { x: number; y: number }[] = [];
    private platforms: { x: number; y: number; width: number }[] = [];
    private apples: { x: number; y: number; collected: boolean }[] = [];
    private goal!: { x: number; y: number };
    private graphics!: Phaser.GameObjects.Graphics;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private isGrounded = false;
    private score = 0;
    private gameOver = false;
    private won = false;
    private onScoreUpdate?: (score: number, length: number) => void;
    private onGameEnd?: (won: boolean, score: number) => void;

    private readonly GRAVITY = 1200;
    private readonly JUMP_FORCE = -550;
    private readonly MOVE_SPEED = 250;
    private readonly HEAD_SIZE = 24;
    private readonly BODY_SIZE = 20;
    private readonly SEGMENT_SPACING = 15;
    private readonly MAX_PATH_HISTORY = 1000;

    constructor() {
        super('SnakePlatformer');
    }

    init(data: { onScoreUpdate?: (score: number, length: number) => void; onGameEnd?: (won: boolean, score: number) => void }) {
        this.onScoreUpdate = data.onScoreUpdate;
        this.onGameEnd = data.onGameEnd;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x000000);

        this.graphics = this.add.graphics();
        this.gameOver = false;
        this.won = false;
        this.score = 0;
        this.isGrounded = false;
        this.pathHistory = [];

        this.head = { x: 150, y: 650, vx: 0, vy: 0 };

        this.body = [];
        for (let i = 0; i < 3; i++) {
            this.body.push({ x: 150 - (i + 1) * this.SEGMENT_SPACING, y: 650 });
        }

        this.createLevel();
        this.cursors = this.input.keyboard!.createCursorKeys();

        for (let i = 0; i < 100; i++) {
            this.pathHistory.push({ x: this.head.x, y: this.head.y });
        }
    }

    private createLevel() {
        this.platforms = [];
        this.apples = [];

        // Ground
        this.platforms.push({ x: 512, y: 700, width: 1024 });

        const levelHeight = 3000;
        let y = 600;
        let lastX = 200;

        while (y > -levelHeight) {
            const width = Phaser.Math.Between(150, 300);
            const x = Phaser.Math.Clamp(
                lastX + Phaser.Math.Between(-200, 200),
                width / 2 + 50,
                1024 - width / 2 - 50
            );

            this.platforms.push({ x, y, width });

            if (Math.random() > 0.4) {
                this.apples.push({ x, y: y - 30, collected: false });
            }

            lastX = x;
            y -= Phaser.Math.Between(80, 130);
        }

        this.goal = { x: lastX, y: y + 50 };
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
            this.head.vx = -this.MOVE_SPEED;
        } else if (this.cursors.right.isDown) {
            this.head.vx = this.MOVE_SPEED;
        } else {
            this.head.vx *= 0.85;
        }

        if (this.cursors.up.isDown && this.isGrounded) {
            this.head.vy = this.JUMP_FORCE;
            this.isGrounded = false;
        }

        this.head.vy += this.GRAVITY * dt;
        this.head.x += this.head.vx * dt;
        this.head.y += this.head.vy * dt;

        this.head.x = Phaser.Math.Clamp(this.head.x, this.HEAD_SIZE / 2, 1024 - this.HEAD_SIZE / 2);

        this.isGrounded = false;
        for (const platform of this.platforms) {
            if (this.checkPlatformCollision(this.head.x, this.head.y, this.HEAD_SIZE, platform)) {
                this.head.y = platform.y - 15 - this.HEAD_SIZE / 2;
                this.head.vy = 0;
                this.isGrounded = true;
            }
        }

        this.pathHistory.unshift({ x: this.head.x, y: this.head.y });
        if (this.pathHistory.length > this.MAX_PATH_HISTORY) {
            this.pathHistory.pop();
        }

        for (let i = 0; i < this.body.length; i++) {
            const pathIndex = (i + 1) * this.SEGMENT_SPACING;
            if (pathIndex < this.pathHistory.length) {
                this.body[i].x = this.pathHistory[pathIndex].x;
                this.body[i].y = this.pathHistory[pathIndex].y;
            }
        }

        for (const apple of this.apples) {
            if (!apple.collected) {
                const dx = this.head.x - apple.x;
                const dy = this.head.y - apple.y;
                if (Math.sqrt(dx * dx + dy * dy) < 30) {
                    apple.collected = true;
                    this.score++;
                    const lastSeg = this.body[this.body.length - 1];
                    this.body.push({ x: lastSeg.x, y: lastSeg.y });
                    this.onScoreUpdate?.(this.score, this.body.length + 1);
                }
            }
        }

        const goalDx = this.head.x - this.goal.x;
        const goalDy = this.head.y - this.goal.y;
        if (Math.sqrt(goalDx * goalDx + goalDy * goalDy) < 40) {
            this.endGame(true);
        }

        if (this.head.y > this.cameras.main.scrollY + 850) {
            this.endGame(false);
        }

        const targetY = Math.min(0, this.head.y - 400);
        this.cameras.main.scrollY += (targetY - this.cameras.main.scrollY) * 0.1;

        this.draw();
    }

    private checkPlatformCollision(x: number, y: number, size: number, platform: { x: number; y: number; width: number }): boolean {
        if (this.head.vy <= 0) return false;

        const entityBottom = y + size / 2;
        const entityLeft = x - size / 2;
        const entityRight = x + size / 2;

        const platTop = platform.y - 15;
        const platLeft = platform.x - platform.width / 2;
        const platRight = platform.x + platform.width / 2;

        const verticalHit = entityBottom >= platTop && entityBottom <= platTop + 30;
        const horizontalHit = entityRight > platLeft && entityLeft < platRight;

        return verticalHit && horizontalHit;
    }

    private draw() {
        this.graphics.clear();

        // Draw platforms - dark gray
        for (const platform of this.platforms) {
            this.graphics.fillStyle(0x262626, 1);
            this.graphics.fillRoundedRect(
                platform.x - platform.width / 2,
                platform.y - 15,
                platform.width,
                30,
                6
            );
            // Top highlight
            this.graphics.fillStyle(0x333333, 1);
            this.graphics.fillRect(
                platform.x - platform.width / 2,
                platform.y - 15,
                platform.width,
                4
            );
        }

        // Draw apples - emerald
        for (const apple of this.apples) {
            if (!apple.collected) {
                this.graphics.fillStyle(0x10b981, 1);
                this.graphics.fillCircle(apple.x, apple.y, 12);
                // Stem
                this.graphics.fillStyle(0x666666, 1);
                this.graphics.fillRect(apple.x - 2, apple.y - 18, 4, 8);
            }
        }

        // Draw goal flag
        this.graphics.fillStyle(0xffffff, 1);
        this.graphics.fillRect(this.goal.x - 3, this.goal.y - 60, 6, 70);
        this.graphics.fillStyle(0x10b981, 1);
        this.graphics.fillTriangle(
            this.goal.x + 3, this.goal.y - 60,
            this.goal.x + 3, this.goal.y - 30,
            this.goal.x + 40, this.goal.y - 45
        );

        // Draw snake body (back to front)
        for (let i = this.body.length - 1; i >= 0; i--) {
            const segment = this.body[i];
            const alpha = 0.4 + (0.6 * (this.body.length - i) / this.body.length);
            this.graphics.fillStyle(0xe5e5e5, alpha);
            this.graphics.fillCircle(segment.x, segment.y, this.BODY_SIZE / 2);
        }

        // Draw snake head - white
        this.graphics.fillStyle(0xffffff, 1);
        this.graphics.fillCircle(this.head.x, this.head.y, this.HEAD_SIZE / 2);

        // Eyes
        const eyeOffsetX = this.head.vx > 0 ? 4 : -4;
        this.graphics.fillStyle(0x000000, 1);
        this.graphics.fillCircle(this.head.x + eyeOffsetX - 3, this.head.y - 3, 3);
        this.graphics.fillCircle(this.head.x + eyeOffsetX + 3, this.head.y - 3, 3);
    }

    private endGame(won: boolean) {
        this.gameOver = true;
        this.won = won;
        this.onGameEnd?.(won, this.score);
    }
}

export default function SnakePlatformerPage() {
    const gameRef = useRef<Phaser.Game | null>(null);
    const [score, setScore] = useState(0);
    const [length, setLength] = useState(4);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [highScore, setHighScore] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem('snake-platformer-high-score');
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
                scene: [SnakePlatformerScene]
            };

            gameRef.current = new Phaser.Game(config);

            gameRef.current.events.once('ready', () => {
                const scene = gameRef.current?.scene.getScene('SnakePlatformer') as SnakePlatformerScene;
                scene?.scene.restart({
                    onScoreUpdate: (s: number, l: number) => { setScore(s); setLength(l); },
                    onGameEnd: (w: boolean, s: number) => {
                        setGameOver(true);
                        setWon(w);
                        if (s > highScore) {
                            setHighScore(s);
                            localStorage.setItem('snake-platformer-high-score', s.toString());
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
        setLength(4);
        setGameOver(false);
        setWon(false);
        const scene = gameRef.current?.scene.getScene('SnakePlatformer') as SnakePlatformerScene;
        scene?.scene.restart({
            onScoreUpdate: (s: number, l: number) => { setScore(s); setLength(l); },
            onGameEnd: (w: boolean, s: number) => {
                setGameOver(true);
                setWon(w);
                if (s > highScore) {
                    setHighScore(s);
                    localStorage.setItem('snake-platformer-high-score', s.toString());
                }
            }
        });
    };

    return (
        <>
            <Head>
                <title>Snake + Platformer | Game Arcade</title>
                <meta name="description" content="Control a snake with platformer physics" />
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
                            <h1 className="text-lg font-semibold">Snake + Platformer</h1>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-white/60">
                                <Apple className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm font-medium">{score}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/60">
                                <span className="text-xs">Length:</span>
                                <span className="text-sm font-medium">{length}</span>
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
                                    <p className="text-white/60 text-lg mb-2">Final Length: {length}</p>
                                    <p className="text-white/60 text-lg mb-6">Apples: {score}</p>
                                    {score === highScore && score > 0 && (
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
                        <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">←</kbd> <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">→</kbd> to move · <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">↑</kbd> to jump · Reach the flag!
                    </motion.p>
                </main>
            </div>
        </>
    );
}

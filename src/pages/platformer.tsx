import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Phaser from 'phaser';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, Trophy, Coins, ArrowUp } from 'lucide-react';

class PlatformerScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private platforms: Phaser.GameObjects.Rectangle[] = [];
    private coins: Phaser.GameObjects.Arc[] = [];
    private velocityX = 0;
    private velocityY = 0;
    private isGrounded = false;
    private score = 0;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private cameraOffsetY = 0;
    private highestY = 600;
    private gameOver = false;
    private playerStartY = 600;
    private graphics!: Phaser.GameObjects.Graphics;
    private onScoreUpdate?: (score: number) => void;
    private onGameOver?: (score: number) => void;

    private readonly GRAVITY = 800;
    private readonly JUMP_FORCE = -450;
    private readonly MOVE_SPEED = 300;
    private readonly PLAYER_WIDTH = 32;
    private readonly PLAYER_HEIGHT = 48;

    constructor() {
        super('Platformer');
    }

    init(data: { onScoreUpdate?: (score: number) => void; onGameOver?: (score: number) => void }) {
        this.onScoreUpdate = data.onScoreUpdate;
        this.onGameOver = data.onGameOver;
    }

    create() {
        // Pure black background
        this.cameras.main.setBackgroundColor(0x000000);

        this.velocityX = 0;
        this.velocityY = 0;
        this.isGrounded = false;
        this.score = 0;
        this.cameraOffsetY = 0;
        this.highestY = 600;
        this.gameOver = false;
        this.platforms = [];
        this.coins = [];

        this.graphics = this.add.graphics();

        // Create player - white rectangle
        this.player = this.add.rectangle(512, this.playerStartY, this.PLAYER_WIDTH, this.PLAYER_HEIGHT, 0xffffff);

        // Generate initial platforms
        this.generatePlatforms();

        // Input
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Ground platform
        const ground = this.add.rectangle(512, 700, 1024, 40, 0x262626);
        this.platforms.push(ground);
    }

    private generatePlatforms() {
        // Generate platforms going upward
        for (let y = 550; y > -5000; y -= Phaser.Math.Between(80, 150)) {
            const x = Phaser.Math.Between(100, 924);
            const width = Phaser.Math.Between(100, 200);
            // Dark gray platforms
            const platform = this.add.rectangle(x, y, width, 20, 0x333333);
            this.platforms.push(platform);

            // Add coins on some platforms - emerald
            if (Math.random() > 0.5) {
                const coin = this.add.circle(x, y - 30, 12, 0x10b981);
                this.coins.push(coin);
            }
        }
    }

    update(_time: number, delta: number) {
        if (this.gameOver) {
            if (this.cursors.space?.isDown) {
                this.scene.restart();
            }
            return;
        }

        const dt = delta / 1000;

        // Horizontal movement
        if (this.cursors.left.isDown) {
            this.velocityX = -this.MOVE_SPEED;
        } else if (this.cursors.right.isDown) {
            this.velocityX = this.MOVE_SPEED;
        } else {
            this.velocityX *= 0.8;
        }

        // Jump
        if (this.cursors.up.isDown && this.isGrounded) {
            this.velocityY = this.JUMP_FORCE;
            this.isGrounded = false;
        }

        // Apply gravity
        this.velocityY += this.GRAVITY * dt;

        // Update position
        this.player.x += this.velocityX * dt;
        this.player.y += this.velocityY * dt;

        // Screen wrap
        if (this.player.x < 0) this.player.x = 1024;
        if (this.player.x > 1024) this.player.x = 0;

        // Platform collision
        this.isGrounded = false;
        for (const platform of this.platforms) {
            if (this.checkPlatformCollision(platform)) {
                this.player.y = platform.y - platform.height / 2 - this.PLAYER_HEIGHT / 2;
                this.velocityY = 0;
                this.isGrounded = true;
            }
        }

        // Coin collection
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            const dx = this.player.x - coin.x;
            const dy = this.player.y - coin.y;
            if (Math.sqrt(dx * dx + dy * dy) < 30) {
                coin.destroy();
                this.coins.splice(i, 1);
                this.score += 100;
                this.onScoreUpdate?.(this.score);
            }
        }

        // Update camera to follow player going up
        if (this.player.y < this.highestY) {
            this.highestY = this.player.y;
            this.score += 1;
            this.onScoreUpdate?.(this.score);
        }

        // Camera follows player
        const targetCameraY = Math.min(0, this.player.y - 400);
        this.cameras.main.scrollY = targetCameraY;

        // Check if player fell below camera
        if (this.player.y > this.cameras.main.scrollY + 800) {
            this.endGame();
        }

        this.draw();
    }

    private checkPlatformCollision(platform: Phaser.GameObjects.Rectangle): boolean {
        // Only check collision when falling
        if (this.velocityY <= 0) return false;

        const playerBottom = this.player.y + this.PLAYER_HEIGHT / 2;
        const playerTop = this.player.y - this.PLAYER_HEIGHT / 2;
        const playerLeft = this.player.x - this.PLAYER_WIDTH / 2;
        const playerRight = this.player.x + this.PLAYER_WIDTH / 2;

        const platTop = platform.y - platform.height / 2;
        const platBottom = platform.y + platform.height / 2;
        const platLeft = platform.x - platform.width / 2;
        const platRight = platform.x + platform.width / 2;

        // Check if player feet are near platform top
        const verticalOverlap = playerBottom >= platTop && playerTop < platTop;
        const horizontalOverlap = playerRight > platLeft && playerLeft < platRight;

        return verticalOverlap && horizontalOverlap;
    }

    private draw() {
        this.graphics.clear();

        // Add subtle glow effect around player
        this.graphics.lineStyle(2, 0x666666, 0.3);
        this.graphics.strokeRect(
            this.player.x - this.PLAYER_WIDTH / 2 - 2,
            this.player.y - this.PLAYER_HEIGHT / 2 - 2,
            this.PLAYER_WIDTH + 4,
            this.PLAYER_HEIGHT + 4
        );

        // Platform highlight effect
        for (const platform of this.platforms) {
            this.graphics.fillStyle(0x404040, 1);
            this.graphics.fillRect(
                platform.x - platform.width / 2,
                platform.y - platform.height / 2,
                platform.width,
                4
            );
        }
    }

    private endGame() {
        this.gameOver = true;
        this.onGameOver?.(this.score);
    }
}

export default function PlatformerPage() {
    const gameRef = useRef<Phaser.Game | null>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [highScore, setHighScore] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem('platformer-high-score');
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
                scene: [PlatformerScene]
            };

            gameRef.current = new Phaser.Game(config);

            gameRef.current.events.once('ready', () => {
                const scene = gameRef.current?.scene.getScene('Platformer') as PlatformerScene;
                scene?.scene.restart({
                    onScoreUpdate: (newScore: number) => setScore(newScore),
                    onGameOver: (finalScore: number) => {
                        setGameOver(true);
                        if (finalScore > highScore) {
                            setHighScore(finalScore);
                            localStorage.setItem('platformer-high-score', finalScore.toString());
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
        const scene = gameRef.current?.scene.getScene('Platformer') as PlatformerScene;
        scene?.scene.restart({
            onScoreUpdate: (newScore: number) => setScore(newScore),
            onGameOver: (finalScore: number) => {
                setGameOver(true);
                if (finalScore > highScore) {
                    setHighScore(finalScore);
                    localStorage.setItem('platformer-high-score', finalScore.toString());
                }
            }
        });
    };

    return (
        <>
            <Head>
                <title>Platformer | Game Arcade</title>
                <meta name="description" content="Jump and climb in this minimalist platformer" />
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
                            <h1 className="text-lg font-semibold">Platformer</h1>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-white/60">
                                <ArrowUp className="w-4 h-4 text-emerald-500" />
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

                    {/* Controls hint */}
                    <motion.p
                        className="mt-6 text-white/40 text-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">←</kbd> <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">→</kbd> to move · <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">↑</kbd> to jump
                    </motion.p>
                </main>
            </div>
        </>
    );
}

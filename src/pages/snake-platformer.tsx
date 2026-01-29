import { useEffect, useRef } from 'react';
import Head from 'next/head';
import Phaser from 'phaser';

/**
 * SNAKE + PLATFORMER HYBRID
 *
 * Concept: A platformer where you control a snake! The head moves with platformer
 * physics (gravity, jumping), and body segments follow the head's path with a delay.
 *
 * - Collect apples to grow longer
 * - Navigate platforms without getting your body stuck
 * - Your body follows the exact path your head took
 * - Don't let your body fall off platforms!
 * - Reach the flag at the top to win
 */

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
    private scoreText!: Phaser.GameObjects.Text;
    private gameOver = false;
    private won = false;
    private cameraY = 0;

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

    create() {
        this.cameras.main.setBackgroundColor(0x2c3e50);

        this.graphics = this.add.graphics();
        this.gameOver = false;
        this.won = false;
        this.score = 0;
        this.cameraY = 0;
        this.isGrounded = false;
        this.pathHistory = [];

        // Initialize head
        this.head = { x: 150, y: 650, vx: 0, vy: 0 };

        // Initialize body (starts with 3 segments)
        this.body = [];
        for (let i = 0; i < 3; i++) {
            this.body.push({ x: 150 - (i + 1) * this.SEGMENT_SPACING, y: 650 });
        }

        // Create level
        this.createLevel();

        // Input
        this.cursors = this.input.keyboard!.createCursorKeys();

        // UI
        this.scoreText = this.add.text(16, 16, 'Length: 4 | Apples: 0', {
            fontSize: '24px',
            color: '#ecf0f1'
        }).setScrollFactor(0);

        this.add.text(16, 50, 'Arrow keys to move. Collect apples to grow. Reach the flag!', {
            fontSize: '14px',
            color: '#95a5a6'
        }).setScrollFactor(0);

        // Initialize path history with starting positions
        for (let i = 0; i < 100; i++) {
            this.pathHistory.push({ x: this.head.x, y: this.head.y });
        }
    }

    private createLevel() {
        this.platforms = [];
        this.apples = [];

        // Ground
        this.platforms.push({ x: 512, y: 700, width: 1024 });

        // Generate platforms going up
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

            // Add apple on some platforms
            if (Math.random() > 0.4) {
                this.apples.push({ x, y: y - 30, collected: false });
            }

            lastX = x;
            y -= Phaser.Math.Between(80, 130);
        }

        // Goal at top
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

        // Horizontal movement
        if (this.cursors.left.isDown) {
            this.head.vx = -this.MOVE_SPEED;
        } else if (this.cursors.right.isDown) {
            this.head.vx = this.MOVE_SPEED;
        } else {
            this.head.vx *= 0.85;
        }

        // Jump
        if (this.cursors.up.isDown && this.isGrounded) {
            this.head.vy = this.JUMP_FORCE;
            this.isGrounded = false;
        }

        // Apply gravity
        this.head.vy += this.GRAVITY * dt;

        // Update head position
        this.head.x += this.head.vx * dt;
        this.head.y += this.head.vy * dt;

        // Screen boundaries
        this.head.x = Phaser.Math.Clamp(this.head.x, this.HEAD_SIZE / 2, 1024 - this.HEAD_SIZE / 2);

        // Platform collision for head
        this.isGrounded = false;
        for (const platform of this.platforms) {
            if (this.checkPlatformCollision(this.head.x, this.head.y, this.HEAD_SIZE, platform)) {
                this.head.y = platform.y - 15 - this.HEAD_SIZE / 2;
                this.head.vy = 0;
                this.isGrounded = true;
            }
        }

        // Record path history
        this.pathHistory.unshift({ x: this.head.x, y: this.head.y });
        if (this.pathHistory.length > this.MAX_PATH_HISTORY) {
            this.pathHistory.pop();
        }

        // Update body segments to follow path
        for (let i = 0; i < this.body.length; i++) {
            const pathIndex = (i + 1) * this.SEGMENT_SPACING;
            if (pathIndex < this.pathHistory.length) {
                this.body[i].x = this.pathHistory[pathIndex].x;
                this.body[i].y = this.pathHistory[pathIndex].y;
            }
        }

        // Check apple collection
        for (const apple of this.apples) {
            if (!apple.collected) {
                const dx = this.head.x - apple.x;
                const dy = this.head.y - apple.y;
                if (Math.sqrt(dx * dx + dy * dy) < 30) {
                    apple.collected = true;
                    this.score++;
                    // Add new body segment
                    const lastSeg = this.body[this.body.length - 1];
                    this.body.push({ x: lastSeg.x, y: lastSeg.y });
                    this.scoreText.setText(`Length: ${this.body.length + 1} | Apples: ${this.score}`);
                }
            }
        }

        // Check goal
        const goalDx = this.head.x - this.goal.x;
        const goalDy = this.head.y - this.goal.y;
        if (Math.sqrt(goalDx * goalDx + goalDy * goalDy) < 40) {
            this.endGame(true);
        }

        // Check if fell
        if (this.head.y > this.cameras.main.scrollY + 850) {
            this.endGame(false);
        }

        // Camera follows head
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

        // Draw platforms
        this.graphics.fillStyle(0x27ae60, 1);
        for (const platform of this.platforms) {
            this.graphics.fillRect(
                platform.x - platform.width / 2,
                platform.y - 15,
                platform.width,
                30
            );
            // Platform top highlight
            this.graphics.fillStyle(0x2ecc71, 1);
            this.graphics.fillRect(
                platform.x - platform.width / 2,
                platform.y - 15,
                platform.width,
                5
            );
            this.graphics.fillStyle(0x27ae60, 1);
        }

        // Draw apples
        for (const apple of this.apples) {
            if (!apple.collected) {
                this.graphics.fillStyle(0xe74c3c, 1);
                this.graphics.fillCircle(apple.x, apple.y, 12);
                // Apple stem
                this.graphics.fillStyle(0x8b4513, 1);
                this.graphics.fillRect(apple.x - 2, apple.y - 18, 4, 8);
                // Leaf
                this.graphics.fillStyle(0x27ae60, 1);
                this.graphics.fillEllipse(apple.x + 6, apple.y - 14, 8, 5);
            }
        }

        // Draw goal flag
        this.graphics.fillStyle(0xf1c40f, 1);
        this.graphics.fillRect(this.goal.x - 3, this.goal.y - 60, 6, 70);
        this.graphics.fillStyle(0xe74c3c, 1);
        this.graphics.fillTriangle(
            this.goal.x + 3, this.goal.y - 60,
            this.goal.x + 3, this.goal.y - 30,
            this.goal.x + 40, this.goal.y - 45
        );

        // Draw snake body (back to front)
        for (let i = this.body.length - 1; i >= 0; i--) {
            const segment = this.body[i];
            const shade = 0.6 + (0.4 * (this.body.length - i) / this.body.length);
            const green = Math.floor(180 * shade);
            this.graphics.fillStyle(Phaser.Display.Color.GetColor(0, green, 100), 1);
            this.graphics.fillCircle(segment.x, segment.y, this.BODY_SIZE / 2);
        }

        // Draw snake head
        this.graphics.fillStyle(0x00ff88, 1);
        this.graphics.fillCircle(this.head.x, this.head.y, this.HEAD_SIZE / 2);

        // Eyes
        const eyeOffsetX = this.head.vx > 0 ? 4 : -4;
        this.graphics.fillStyle(0xffffff, 1);
        this.graphics.fillCircle(this.head.x + eyeOffsetX - 4, this.head.y - 3, 5);
        this.graphics.fillCircle(this.head.x + eyeOffsetX + 4, this.head.y - 3, 5);
        this.graphics.fillStyle(0x000000, 1);
        this.graphics.fillCircle(this.head.x + eyeOffsetX - 4, this.head.y - 3, 2);
        this.graphics.fillCircle(this.head.x + eyeOffsetX + 4, this.head.y - 3, 2);
    }

    private endGame(won: boolean) {
        this.gameOver = true;
        this.won = won;

        const centerY = this.cameras.main.scrollY + 384;

        const title = won ? 'YOU WIN!' : 'GAME OVER';
        const color = won ? '#00ff88' : '#e74c3c';

        this.add.text(512, centerY, title, {
            fontSize: '64px',
            color: color
        }).setOrigin(0.5);

        this.add.text(512, centerY + 60, `Final Length: ${this.body.length + 1}`, {
            fontSize: '28px',
            color: '#ecf0f1'
        }).setOrigin(0.5);

        this.add.text(512, centerY + 110, 'Press SPACE to restart', {
            fontSize: '20px',
            color: '#95a5a6'
        }).setOrigin(0.5);
    }
}

export default function SnakePlatformerPage() {
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && !gameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: 1024,
                height: 768,
                parent: 'game-container',
                backgroundColor: '#2c3e50',
                scene: [SnakePlatformerScene]
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
                <title>Snake + Platformer</title>
            </Head>
            <main style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                backgroundColor: '#1a1a1a'
            }}>
                <div id="game-container" />
            </main>
        </>
    );
}

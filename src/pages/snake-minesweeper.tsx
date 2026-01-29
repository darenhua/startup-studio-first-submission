import { useEffect, useRef } from 'react';
import Head from 'next/head';
import Phaser from 'phaser';

/**
 * SNAKE + MINESWEEPER HYBRID
 *
 * Concept: The snake navigates through a minesweeper grid. The snake can only see
 * cells it has visited or is adjacent to. Each revealed cell shows the number of
 * adjacent mines. The goal is to eat all the food without hitting a mine.
 *
 * - Snake moves through a grid with hidden mines
 * - Cells are revealed as the snake passes by them
 * - Numbers indicate adjacent mines
 * - Hit a mine = game over
 * - Eat all food to win
 */

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
    private statusText!: Phaser.GameObjects.Text;
    private revealedCells: Set<string> = new Set();

    constructor() {
        super('SnakeMinesweeper');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x1a1a2e);

        this.graphics = this.add.graphics();
        this.gameOver = false;
        this.won = false;
        this.foodEaten = 0;
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.moveTimer = 0;
        this.revealedCells = new Set();

        // Initialize grid
        this.initGrid();

        // Initialize snake in safe zone (center)
        const centerX = Math.floor(this.gridSize / 2);
        const centerY = Math.floor(this.gridSize / 2);
        this.snake = [
            { x: centerX, y: centerY },
            { x: centerX - 1, y: centerY },
            { x: centerX - 2, y: centerY }
        ];

        // Place mines (avoiding snake start area)
        this.placeMines(centerX, centerY);

        // Place food
        this.placeFood();

        // Reveal cells around starting position
        this.revealAroundSnake();

        // UI
        this.statusText = this.add.text(16, 16, `Food: 0/${this.foodCount} | Mines: ${this.mineCount}`, {
            fontSize: '24px',
            color: '#ffffff'
        });

        this.add.text(16, 50, 'Arrow keys to move. Reveal the grid, eat food, avoid mines!', {
            fontSize: '14px',
            color: '#888888'
        });

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
                    if (this.direction.y !== 1) this.nextDirection = { x: 0, y: -1 };
                    break;
                case 'ArrowDown':
                    if (this.direction.y !== -1) this.nextDirection = { x: 0, y: 1 };
                    break;
                case 'ArrowLeft':
                    if (this.direction.x !== 1) this.nextDirection = { x: -1, y: 0 };
                    break;
                case 'ArrowRight':
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

            // Don't place near starting position
            const isSafe = Math.abs(x - safeX) <= 2 && Math.abs(y - safeY) <= 2;

            if (!this.grid[y][x].isMine && !isSafe) {
                this.grid[y][x].isMine = true;
                placed++;
            }
        }

        // Calculate adjacent mines
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

            // Don't place on mines or existing food
            if (!this.grid[y][x].isMine && !this.grid[y][x].hasFood) {
                // Don't place on snake
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

        // Check wall collision
        if (newHead.x < 0 || newHead.x >= this.gridSize ||
            newHead.y < 0 || newHead.y >= this.gridSize) {
            this.endGame(false, 'Hit the wall!');
            return;
        }

        // Check self collision
        for (const segment of this.snake) {
            if (segment.x === newHead.x && segment.y === newHead.y) {
                this.endGame(false, 'Hit yourself!');
                return;
            }
        }

        // Check mine collision
        if (this.grid[newHead.y][newHead.x].isMine) {
            this.endGame(false, 'Hit a mine!');
            return;
        }

        // Add new head
        this.snake.unshift(newHead);

        // Reveal around new position
        this.revealAroundSnake();

        // Check food
        if (this.grid[newHead.y][newHead.x].hasFood) {
            this.grid[newHead.y][newHead.x].hasFood = false;
            this.foodEaten++;
            this.statusText.setText(`Food: ${this.foodEaten}/${this.foodCount} | Mines: ${this.mineCount}`);

            if (this.foodEaten >= this.foodCount) {
                this.endGame(true, 'All food collected!');
                return;
            }
            // Don't remove tail - snake grows
        } else {
            // Remove tail
            this.snake.pop();
        }
    }

    private draw() {
        this.graphics.clear();

        const offsetX = (1024 - this.gridSize * this.tileSize) / 2;
        const offsetY = (768 - this.gridSize * this.tileSize) / 2;

        const numberColors: { [key: number]: string } = {
            1: '#3498db',
            2: '#27ae60',
            3: '#e74c3c',
            4: '#9b59b6',
            5: '#e67e22',
            6: '#1abc9c',
            7: '#34495e',
            8: '#95a5a6'
        };

        // Draw cells
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                const px = offsetX + x * this.tileSize;
                const py = offsetY + y * this.tileSize;

                if (cell.isRevealed) {
                    if (cell.isMine && this.gameOver) {
                        // Revealed mine
                        this.graphics.fillStyle(0xe74c3c, 1);
                        this.graphics.fillRect(px + 1, py + 1, this.tileSize - 2, this.tileSize - 2);
                        this.graphics.fillStyle(0x2c3e50, 1);
                        this.graphics.fillCircle(px + this.tileSize / 2, py + this.tileSize / 2, 10);
                    } else {
                        // Safe revealed cell
                        this.graphics.fillStyle(0x2c3e50, 1);
                        this.graphics.fillRect(px + 1, py + 1, this.tileSize - 2, this.tileSize - 2);

                        if (cell.adjacentMines > 0) {
                            const color = numberColors[cell.adjacentMines] || '#ffffff';
                            this.add.text(px + this.tileSize / 2, py + this.tileSize / 2,
                                cell.adjacentMines.toString(), {
                                    fontSize: '20px',
                                    color: color
                                }).setOrigin(0.5);
                        }

                        if (cell.hasFood) {
                            this.graphics.fillStyle(0xf1c40f, 1);
                            this.graphics.fillCircle(px + this.tileSize / 2, py + this.tileSize / 2, 8);
                        }
                    }
                } else {
                    // Unrevealed (fog of war)
                    this.graphics.fillStyle(0x1a1a2e, 1);
                    this.graphics.fillRect(px + 1, py + 1, this.tileSize - 2, this.tileSize - 2);
                    this.graphics.fillStyle(0x16213e, 1);
                    this.graphics.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
                }
            }
        }

        // Draw snake
        this.snake.forEach((segment, index) => {
            const px = offsetX + segment.x * this.tileSize;
            const py = offsetY + segment.y * this.tileSize;
            const color = index === 0 ? 0x00ff88 : 0x00cc66;
            this.graphics.fillStyle(color, 1);
            this.graphics.fillRect(px + 3, py + 3, this.tileSize - 6, this.tileSize - 6);
        });

        // Grid border
        this.graphics.lineStyle(2, 0x0f3460, 1);
        this.graphics.strokeRect(offsetX, offsetY, this.gridSize * this.tileSize, this.gridSize * this.tileSize);
    }

    private endGame(won: boolean, message: string) {
        this.gameOver = true;
        this.won = won;

        // Reveal all mines
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

        const title = won ? 'YOU WIN!' : 'GAME OVER';
        const color = won ? '#00ff88' : '#e94560';

        this.add.text(512, 360, title, {
            fontSize: '64px',
            color: color
        }).setOrigin(0.5);

        this.add.text(512, 420, message, {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(512, 470, 'Press SPACE to restart', {
            fontSize: '20px',
            color: '#888888'
        }).setOrigin(0.5);
    }
}

export default function SnakeMinesweeperPage() {
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && !gameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: 1024,
                height: 768,
                parent: 'game-container',
                backgroundColor: '#1a1a2e',
                scene: [SnakeMinesweeperScene]
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
                <title>Snake + Minesweeper</title>
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

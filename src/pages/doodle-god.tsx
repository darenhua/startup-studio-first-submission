import { useEffect, useRef } from 'react';
import Head from 'next/head';
import Phaser from 'phaser';

/**
 * DOODLE GOD CLONE
 *
 * Combine elements to create new ones! Start with basic elements and
 * discover the entire universe through experimentation.
 *
 * Drag and drop elements onto each other to combine them.
 * Discover all elements to win!
 */

interface Element {
    id: string;
    name: string;
    emoji: string;
    discovered: boolean;
    group: string;
}

interface Recipe {
    inputs: [string, string];
    output: string;
}

class DoodleGodScene extends Phaser.Scene {
    private elements: Map<string, Element> = new Map();
    private recipes: Recipe[] = [];
    private discoveredOrder: string[] = [];
    private selectedElement: Element | null = null;
    private graphics!: Phaser.GameObjects.Graphics;
    private statusText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;
    private elementSprites: Map<string, { x: number; y: number; text: Phaser.GameObjects.Text }> = new Map();
    private dragElement: Element | null = null;
    private dragX = 0;
    private dragY = 0;
    private lastCombinationResult: string | null = null;
    private resultTimer = 0;

    constructor() {
        super('DoodleGod');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x1a1a2e);

        this.graphics = this.add.graphics();
        this.elementSprites = new Map();

        // Initialize elements
        this.initElements();

        // Initialize recipes
        this.initRecipes();

        // UI (must be created before discoverElement calls)
        this.statusText = this.add.text(512, 30, 'Discovered: 0 / ' + this.elements.size, {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(512, 60, 'Drag elements onto each other to combine!', {
            fontSize: '16px',
            color: '#95a5a6'
        }).setOrigin(0.5);

        this.hintText = this.add.text(512, 730, '', {
            fontSize: '20px',
            color: '#f1c40f'
        }).setOrigin(0.5);

        // Discover starting elements
        this.discoverElement('fire');
        this.discoverElement('water');
        this.discoverElement('earth');
        this.discoverElement('air');

        // Input handling
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.handlePointerDown(pointer.x, pointer.y);
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.dragElement) {
                this.dragX = pointer.x;
                this.dragY = pointer.y;
            }
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            this.handlePointerUp(pointer.x, pointer.y);
        });

        this.layoutElements();
    }

    private initElements() {
        const elementData: Element[] = [
            // Basic elements
            { id: 'fire', name: 'Fire', emoji: '🔥', discovered: false, group: 'basic' },
            { id: 'water', name: 'Water', emoji: '💧', discovered: false, group: 'basic' },
            { id: 'earth', name: 'Earth', emoji: '🌍', discovered: false, group: 'basic' },
            { id: 'air', name: 'Air', emoji: '💨', discovered: false, group: 'basic' },

            // Derived elements
            { id: 'steam', name: 'Steam', emoji: '♨️', discovered: false, group: 'gas' },
            { id: 'mud', name: 'Mud', emoji: '🟤', discovered: false, group: 'earth' },
            { id: 'lava', name: 'Lava', emoji: '🌋', discovered: false, group: 'earth' },
            { id: 'dust', name: 'Dust', emoji: '🌫️', discovered: false, group: 'earth' },
            { id: 'energy', name: 'Energy', emoji: '⚡', discovered: false, group: 'force' },
            { id: 'stone', name: 'Stone', emoji: '🪨', discovered: false, group: 'earth' },
            { id: 'metal', name: 'Metal', emoji: '⚙️', discovered: false, group: 'material' },
            { id: 'rain', name: 'Rain', emoji: '🌧️', discovered: false, group: 'weather' },
            { id: 'storm', name: 'Storm', emoji: '⛈️', discovered: false, group: 'weather' },
            { id: 'lightning', name: 'Lightning', emoji: '⚡', discovered: false, group: 'weather' },
            { id: 'sand', name: 'Sand', emoji: '🏖️', discovered: false, group: 'earth' },
            { id: 'glass', name: 'Glass', emoji: '🔮', discovered: false, group: 'material' },
            { id: 'life', name: 'Life', emoji: '🧬', discovered: false, group: 'life' },
            { id: 'plant', name: 'Plant', emoji: '🌱', discovered: false, group: 'life' },
            { id: 'tree', name: 'Tree', emoji: '🌳', discovered: false, group: 'life' },
            { id: 'wood', name: 'Wood', emoji: '🪵', discovered: false, group: 'material' },
            { id: 'ash', name: 'Ash', emoji: 'ite', discovered: false, group: 'earth' },
            { id: 'coal', name: 'Coal', emoji: '�ite', discovered: false, group: 'earth' },
            { id: 'swamp', name: 'Swamp', emoji: '🐊', discovered: false, group: 'nature' },
            { id: 'bacteria', name: 'Bacteria', emoji: '🦠', discovered: false, group: 'life' },
            { id: 'mushroom', name: 'Mushroom', emoji: '🍄', discovered: false, group: 'life' },
            { id: 'moss', name: 'Moss', emoji: '🌿', discovered: false, group: 'life' },
            { id: 'algae', name: 'Algae', emoji: '🌊', discovered: false, group: 'life' },
            { id: 'fish', name: 'Fish', emoji: '🐟', discovered: false, group: 'animal' },
            { id: 'bird', name: 'Bird', emoji: '🐦', discovered: false, group: 'animal' },
            { id: 'egg', name: 'Egg', emoji: '🥚', discovered: false, group: 'animal' },
            { id: 'lizard', name: 'Lizard', emoji: '🦎', discovered: false, group: 'animal' },
            { id: 'beast', name: 'Beast', emoji: '🦁', discovered: false, group: 'animal' },
            { id: 'human', name: 'Human', emoji: '👤', discovered: false, group: 'human' },
            { id: 'tool', name: 'Tool', emoji: '🔧', discovered: false, group: 'tech' },
            { id: 'wheel', name: 'Wheel', emoji: '☸️', discovered: false, group: 'tech' },
            { id: 'house', name: 'House', emoji: '🏠', discovered: false, group: 'building' },
            { id: 'brick', name: 'Brick', emoji: '🧱', discovered: false, group: 'material' },
            { id: 'city', name: 'City', emoji: '🌆', discovered: false, group: 'building' },
            { id: 'paper', name: 'Paper', emoji: '📄', discovered: false, group: 'material' },
            { id: 'book', name: 'Book', emoji: '📚', discovered: false, group: 'knowledge' },
            { id: 'knowledge', name: 'Knowledge', emoji: '🎓', discovered: false, group: 'knowledge' },
            { id: 'electricity', name: 'Electricity', emoji: '💡', discovered: false, group: 'tech' },
            { id: 'computer', name: 'Computer', emoji: '💻', discovered: false, group: 'tech' },
            { id: 'internet', name: 'Internet', emoji: '🌐', discovered: false, group: 'tech' },
            { id: 'robot', name: 'Robot', emoji: '🤖', discovered: false, group: 'tech' },
            { id: 'time', name: 'Time', emoji: '⏰', discovered: false, group: 'concept' },
            { id: 'philosophy', name: 'Philosophy', emoji: '🤔', discovered: false, group: 'knowledge' },
            { id: 'love', name: 'Love', emoji: '❤️', discovered: false, group: 'concept' },
            { id: 'music', name: 'Music', emoji: '🎵', discovered: false, group: 'art' },
            { id: 'art', name: 'Art', emoji: '🎨', discovered: false, group: 'art' },
        ];

        for (const elem of elementData) {
            this.elements.set(elem.id, elem);
        }
    }

    private initRecipes() {
        this.recipes = [
            // Basic combinations
            { inputs: ['fire', 'water'], output: 'steam' },
            { inputs: ['water', 'earth'], output: 'mud' },
            { inputs: ['fire', 'earth'], output: 'lava' },
            { inputs: ['air', 'earth'], output: 'dust' },
            { inputs: ['fire', 'air'], output: 'energy' },
            { inputs: ['lava', 'water'], output: 'stone' },
            { inputs: ['fire', 'stone'], output: 'metal' },
            { inputs: ['water', 'air'], output: 'rain' },
            { inputs: ['rain', 'air'], output: 'storm' },
            { inputs: ['storm', 'energy'], output: 'lightning' },
            { inputs: ['stone', 'air'], output: 'sand' },
            { inputs: ['sand', 'fire'], output: 'glass' },

            // Life
            { inputs: ['energy', 'mud'], output: 'life' },
            { inputs: ['life', 'earth'], output: 'plant' },
            { inputs: ['plant', 'earth'], output: 'tree' },
            { inputs: ['tree', 'tool'], output: 'wood' },
            { inputs: ['fire', 'wood'], output: 'ash' },
            { inputs: ['fire', 'tree'], output: 'coal' },
            { inputs: ['water', 'plant'], output: 'swamp' },
            { inputs: ['life', 'swamp'], output: 'bacteria' },
            { inputs: ['earth', 'bacteria'], output: 'mushroom' },
            { inputs: ['stone', 'bacteria'], output: 'moss' },
            { inputs: ['water', 'life'], output: 'algae' },
            { inputs: ['algae', 'life'], output: 'fish' },
            { inputs: ['air', 'life'], output: 'bird' },
            { inputs: ['bird', 'bird'], output: 'egg' },
            { inputs: ['egg', 'swamp'], output: 'lizard' },
            { inputs: ['lizard', 'earth'], output: 'beast' },
            { inputs: ['beast', 'life'], output: 'human' },

            // Technology
            { inputs: ['human', 'metal'], output: 'tool' },
            { inputs: ['tool', 'wood'], output: 'wheel' },
            { inputs: ['mud', 'fire'], output: 'brick' },
            { inputs: ['brick', 'human'], output: 'house' },
            { inputs: ['house', 'house'], output: 'city' },
            { inputs: ['wood', 'tool'], output: 'paper' },
            { inputs: ['paper', 'human'], output: 'book' },
            { inputs: ['book', 'human'], output: 'knowledge' },
            { inputs: ['lightning', 'metal'], output: 'electricity' },
            { inputs: ['electricity', 'knowledge'], output: 'computer' },
            { inputs: ['computer', 'computer'], output: 'internet' },
            { inputs: ['computer', 'life'], output: 'robot' },

            // Abstract
            { inputs: ['glass', 'sand'], output: 'time' },
            { inputs: ['human', 'knowledge'], output: 'philosophy' },
            { inputs: ['human', 'human'], output: 'love' },
            { inputs: ['human', 'air'], output: 'music' },
            { inputs: ['human', 'paper'], output: 'art' },
        ];
    }

    private discoverElement(id: string) {
        const element = this.elements.get(id);
        if (element && !element.discovered) {
            element.discovered = true;
            this.discoveredOrder.push(id);
            this.layoutElements();
            this.updateStatus();
        }
    }

    private updateStatus() {
        const discovered = Array.from(this.elements.values()).filter(e => e.discovered).length;
        this.statusText.setText(`Discovered: ${discovered} / ${this.elements.size}`);

        if (discovered === this.elements.size) {
            this.hintText.setText('🎉 Congratulations! You discovered everything! 🎉');
            this.hintText.setColor('#2ecc71');
        }
    }

    private layoutElements() {
        // Clear old sprites
        this.elementSprites.forEach(sprite => {
            sprite.text.destroy();
        });
        this.elementSprites.clear();

        const discovered = this.discoveredOrder
            .map(id => this.elements.get(id))
            .filter((e): e is Element => e !== undefined && e.discovered);

        const cols = 8;
        const startX = 100;
        const startY = 120;
        const spacingX = 115;
        const spacingY = 80;

        discovered.forEach((element, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;

            const text = this.add.text(x, y, `${element.emoji}\n${element.name}`, {
                fontSize: '24px',
                color: '#ffffff',
                align: 'center'
            }).setOrigin(0.5);

            this.elementSprites.set(element.id, { x, y, text });
        });
    }

    private handlePointerDown(x: number, y: number) {
        // Find clicked element
        this.elementSprites.forEach((sprite, id) => {
            const dx = x - sprite.x;
            const dy = y - sprite.y;
            if (Math.abs(dx) < 50 && Math.abs(dy) < 40) {
                const element = this.elements.get(id);
                if (element && element.discovered) {
                    this.dragElement = element;
                    this.dragX = x;
                    this.dragY = y;
                }
            }
        });
    }

    private handlePointerUp(x: number, y: number) {
        if (!this.dragElement) return;

        // Find target element
        let targetElement: Element | null = null;
        this.elementSprites.forEach((sprite, id) => {
            const dx = x - sprite.x;
            const dy = y - sprite.y;
            if (Math.abs(dx) < 50 && Math.abs(dy) < 40) {
                const element = this.elements.get(id);
                if (element && element.discovered && element.id !== this.dragElement?.id) {
                    targetElement = element;
                }
            }
        });

        // Try to combine
        if (targetElement && this.dragElement) {
            this.tryCombine(this.dragElement, targetElement);
        }

        this.dragElement = null;
    }

    private tryCombine(elem1: Element, elem2: Element) {
        for (const recipe of this.recipes) {
            const [a, b] = recipe.inputs;
            if ((a === elem1.id && b === elem2.id) || (a === elem2.id && b === elem1.id)) {
                const resultElement = this.elements.get(recipe.output);
                if (resultElement) {
                    if (!resultElement.discovered) {
                        this.discoverElement(recipe.output);
                        this.showResult(`✨ Created: ${resultElement.emoji} ${resultElement.name}!`);
                    } else {
                        this.showResult(`${resultElement.emoji} ${resultElement.name} (already discovered)`);
                    }
                    return;
                }
            }
        }
        this.showResult('❌ No reaction...');
    }

    private showResult(text: string) {
        this.lastCombinationResult = text;
        this.resultTimer = 2000;
        this.hintText.setText(text);
        this.hintText.setColor(text.startsWith('✨') ? '#f1c40f' : '#95a5a6');
    }

    update(_time: number, delta: number) {
        this.graphics.clear();

        // Draw element boxes
        this.elementSprites.forEach((sprite, id) => {
            const element = this.elements.get(id);
            if (element && element.discovered) {
                this.graphics.fillStyle(0x2c3e50, 1);
                this.graphics.fillRoundedRect(sprite.x - 45, sprite.y - 30, 90, 60, 10);
                this.graphics.lineStyle(2, 0x3498db, 1);
                this.graphics.strokeRoundedRect(sprite.x - 45, sprite.y - 30, 90, 60, 10);
            }
        });

        // Draw dragged element
        if (this.dragElement) {
            this.graphics.fillStyle(0x9b59b6, 0.8);
            this.graphics.fillRoundedRect(this.dragX - 45, this.dragY - 30, 90, 60, 10);
            this.add.text(this.dragX, this.dragY, `${this.dragElement.emoji}\n${this.dragElement.name}`, {
                fontSize: '24px',
                color: '#ffffff',
                align: 'center'
            }).setOrigin(0.5).setDepth(100);
        }

        // Clear old floating text
        this.children.list
            .filter(child => child instanceof Phaser.GameObjects.Text && (child as any).depth === 100)
            .forEach(child => child.destroy());

        // Result timer
        if (this.resultTimer > 0) {
            this.resultTimer -= delta;
            if (this.resultTimer <= 0) {
                const discovered = Array.from(this.elements.values()).filter(e => e.discovered).length;
                if (discovered < this.elements.size) {
                    this.hintText.setText('');
                }
            }
        }
    }
}

export default function DoodleGodPage() {
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && !gameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: 1024,
                height: 768,
                parent: 'game-container',
                backgroundColor: '#1a1a2e',
                scene: [DoodleGodScene]
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
                <title>Doodle God</title>
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

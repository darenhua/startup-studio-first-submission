import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Phaser from 'phaser';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, RotateCcw, Lightbulb } from 'lucide-react';

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
    private graphics!: Phaser.GameObjects.Graphics;
    private elementSprites: Map<string, { x: number; y: number; text: Phaser.GameObjects.Text }> = new Map();
    private dragElement: Element | null = null;
    private dragX = 0;
    private dragY = 0;
    private resultTimer = 0;
    private onDiscoveryUpdate?: (discovered: number, total: number) => void;
    private onCombinationResult?: (result: string, isNew: boolean) => void;

    constructor() {
        super('DoodleGod');
    }

    init(data: { onDiscoveryUpdate?: (discovered: number, total: number) => void; onCombinationResult?: (result: string, isNew: boolean) => void }) {
        this.onDiscoveryUpdate = data.onDiscoveryUpdate;
        this.onCombinationResult = data.onCombinationResult;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x000000);

        this.graphics = this.add.graphics();
        this.elementSprites = new Map();
        this.discoveredOrder = [];
        this.dragElement = null;

        this.initElements();
        this.initRecipes();

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
            { id: 'fire', name: 'Fire', emoji: '🔥', discovered: false, group: 'basic' },
            { id: 'water', name: 'Water', emoji: '💧', discovered: false, group: 'basic' },
            { id: 'earth', name: 'Earth', emoji: '🌍', discovered: false, group: 'basic' },
            { id: 'air', name: 'Air', emoji: '💨', discovered: false, group: 'basic' },
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
            { id: 'coal', name: 'Coal', emoji: '⬛', discovered: false, group: 'earth' },
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
        this.onDiscoveryUpdate?.(discovered, this.elements.size);
    }

    private layoutElements() {
        this.elementSprites.forEach(sprite => {
            sprite.text.destroy();
        });
        this.elementSprites.clear();

        const discovered = this.discoveredOrder
            .map(id => this.elements.get(id))
            .filter((e): e is Element => e !== undefined && e.discovered);

        const cols = 8;
        const startX = 100;
        const startY = 100;
        const spacingX = 115;
        const spacingY = 80;

        discovered.forEach((element, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;

            const text = this.add.text(x, y, `${element.emoji}\n${element.name}`, {
                fontSize: '20px',
                color: '#ffffff',
                align: 'center'
            }).setOrigin(0.5);

            this.elementSprites.set(element.id, { x, y, text });
        });
    }

    private handlePointerDown(x: number, y: number) {
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
                        this.onCombinationResult?.(`${resultElement.emoji} ${resultElement.name}`, true);
                    } else {
                        this.onCombinationResult?.(`${resultElement.emoji} ${resultElement.name}`, false);
                    }
                    return;
                }
            }
        }
        this.onCombinationResult?.('No reaction', false);
    }

    update(_time: number, delta: number) {
        this.graphics.clear();

        // Draw element boxes
        this.elementSprites.forEach((sprite, id) => {
            const element = this.elements.get(id);
            if (element && element.discovered) {
                // Dark card background
                this.graphics.fillStyle(0x1a1a1a, 1);
                this.graphics.fillRoundedRect(sprite.x - 48, sprite.y - 32, 96, 64, 8);
                // Border
                this.graphics.lineStyle(1, 0x333333, 1);
                this.graphics.strokeRoundedRect(sprite.x - 48, sprite.y - 32, 96, 64, 8);
            }
        });

        // Draw dragged element
        if (this.dragElement) {
            this.graphics.fillStyle(0x10b981, 0.3);
            this.graphics.fillRoundedRect(this.dragX - 48, this.dragY - 32, 96, 64, 8);
            this.graphics.lineStyle(2, 0x10b981, 1);
            this.graphics.strokeRoundedRect(this.dragX - 48, this.dragY - 32, 96, 64, 8);

            // Clean up old floating text
            this.children.list
                .filter(child => child instanceof Phaser.GameObjects.Text && (child as any).depth === 100)
                .forEach(child => child.destroy());

            this.add.text(this.dragX, this.dragY, `${this.dragElement.emoji}\n${this.dragElement.name}`, {
                fontSize: '20px',
                color: '#ffffff',
                align: 'center'
            }).setOrigin(0.5).setDepth(100);
        }

        // Clean up floating text when not dragging
        if (!this.dragElement) {
            this.children.list
                .filter(child => child instanceof Phaser.GameObjects.Text && (child as any).depth === 100)
                .forEach(child => child.destroy());
        }
    }
}

export default function DoodleGodPage() {
    const gameRef = useRef<Phaser.Game | null>(null);
    const [discovered, setDiscovered] = useState(0);
    const [total, setTotal] = useState(50);
    const [lastResult, setLastResult] = useState<{ text: string; isNew: boolean } | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && !gameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: 1024,
                height: 768,
                parent: 'game-container',
                backgroundColor: '#000000',
                scene: [DoodleGodScene]
            };

            gameRef.current = new Phaser.Game(config);

            gameRef.current.events.once('ready', () => {
                const scene = gameRef.current?.scene.getScene('DoodleGod') as DoodleGodScene;
                scene?.scene.restart({
                    onDiscoveryUpdate: (d: number, t: number) => {
                        setDiscovered(d);
                        setTotal(t);
                    },
                    onCombinationResult: (result: string, isNew: boolean) => {
                        setLastResult({ text: result, isNew });
                        setTimeout(() => setLastResult(null), 2000);
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
        setDiscovered(0);
        setLastResult(null);
        const scene = gameRef.current?.scene.getScene('DoodleGod') as DoodleGodScene;
        scene?.scene.restart({
            onDiscoveryUpdate: (d: number, t: number) => {
                setDiscovered(d);
                setTotal(t);
            },
            onCombinationResult: (result: string, isNew: boolean) => {
                setLastResult({ text: result, isNew });
                setTimeout(() => setLastResult(null), 2000);
            }
        });
    };

    const progressPercent = (discovered / total) * 100;

    return (
        <>
            <Head>
                <title>Doodle God | Game Arcade</title>
                <meta name="description" content="Combine elements to create the universe" />
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
                            <h1 className="text-lg font-semibold">Doodle God</h1>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm text-white/60">{discovered} / {total}</span>
                                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercent}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleRestart}
                                className="flex items-center gap-2 px-3 py-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span className="text-sm">Reset</span>
                            </button>
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

                        {/* Combination Result Toast */}
                        <AnimatePresence>
                            {lastResult && (
                                <motion.div
                                    className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg border backdrop-blur-sm ${
                                        lastResult.isNew
                                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                            : lastResult.text === 'No reaction'
                                            ? 'bg-white/5 border-white/10 text-white/60'
                                            : 'bg-white/5 border-white/10 text-white/60'
                                    }`}
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    {lastResult.isNew && <span className="mr-2">✨</span>}
                                    {lastResult.text}
                                    {lastResult.isNew && !lastResult.text.includes('No reaction') && <span className="ml-2 text-xs">(New!)</span>}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Win overlay */}
                        {discovered === total && (
                            <motion.div
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-center"
                                >
                                    <h2 className="text-4xl font-bold text-emerald-400 mb-2">Complete!</h2>
                                    <p className="text-white/60 text-lg mb-6">You discovered everything!</p>
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
                    <motion.div
                        className="mt-6 flex items-center gap-2 text-white/40 text-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Lightbulb className="w-4 h-4" />
                        <span>Drag elements onto each other to combine them</span>
                    </motion.div>
                </main>
            </div>
        </>
    );
}

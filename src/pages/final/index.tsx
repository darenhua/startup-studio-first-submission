import Head from "next/head";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Trophy, Play, Sparkles, X } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    DragOverlay,
    useDraggable,
    useDroppable,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
} from "@dnd-kit/core";

// Shimmer animation component
function Shimmer({ className = "", isHovered = false }: { className?: string; isHovered?: boolean }) {
    return (
        <motion.div
            className={`absolute inset-0 ${className}`}
            initial={{ translateX: "-100%" }}
            animate={{
                translateX: isHovered ? ["-100%", "100%"] : "-100%",
            }}
            transition={{
                duration: 0.8,
                ease: "easeInOut",
            }}
            style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
            }}
        />
    );
}

// Animated card wrapper with hover effects
function AnimatedCard({ children, className = "", delay = 0 }: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            whileHover={{ scale: 1.02 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Game card with hover shimmer
function GameCard({ game }: { game: GameData }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Link href={game.href}>
            <Card
                className="bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 cursor-pointer group relative overflow-hidden h-full"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <Shimmer isHovered={isHovered} />
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <CardTitle className="text-white text-lg font-semibold">
                            {game.title}
                        </CardTitle>
                        <motion.div
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            whileHover={{ scale: 1.1 }}
                        >
                            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
                                <Play className="h-4 w-4 text-black ml-0.5" />
                            </div>
                        </motion.div>
                    </div>
                    <CardDescription className="text-white/40 text-sm leading-relaxed">
                        {game.description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex items-center gap-2 mb-4">
                        {game.tags.map((tag) => (
                            <Badge
                                key={tag}
                                variant="outline"
                                className="bg-transparent border-white/20 text-white/60 text-xs"
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>
                    <div className="flex items-center gap-6 text-xs text-white/30">
                        <div className="flex items-center gap-1.5">
                            <Gamepad2 className="h-3.5 w-3.5" />
                            <span>{game.playCount.toLocaleString()} plays</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Trophy className="h-3.5 w-3.5" />
                            <span>High: {game.highScore.toLocaleString()}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

// ============ DOODLE GOD PANEL ============

interface DoodleElement {
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

const initialElements: DoodleElement[] = [
    // Basic elements (start discovered)
    { id: 'fire', name: 'Fire', emoji: '🔥', discovered: true, group: 'basic' },
    { id: 'water', name: 'Water', emoji: '💧', discovered: true, group: 'basic' },
    { id: 'earth', name: 'Earth', emoji: '🌍', discovered: true, group: 'basic' },
    { id: 'air', name: 'Air', emoji: '💨', discovered: true, group: 'basic' },

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
    { id: 'ash', name: 'Ash', emoji: '🌑', discovered: false, group: 'earth' },
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

const recipes: Recipe[] = [
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

// Draggable Element Button
function DraggableElement({
    element,
    isBeingDraggedOver,
    isDraggingThis,
    onClick,
}: {
    element: DoodleElement;
    isBeingDraggedOver: boolean;
    isDraggingThis: boolean;
    onClick: () => void;
}) {
    const { attributes, listeners, setNodeRef: setDraggableRef, transform } = useDraggable({
        id: element.id,
        data: { element },
    });

    const { setNodeRef: setDroppableRef } = useDroppable({
        id: element.id,
        data: { element },
    });

    const combinedRef = (node: HTMLButtonElement | null) => {
        setDraggableRef(node);
        setDroppableRef(node);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
                opacity: isDraggingThis ? 0.4 : 1,
                scale: isBeingDraggedOver ? 1.15 : 1
            }}
            transition={{ duration: 0.2 }}
            style={transform ? {
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
                zIndex: 100,
            } : undefined}
        >
            <Button
                ref={combinedRef}
                {...listeners}
                {...attributes}
                onClick={onClick}
                variant="outline"
                className={`
                    relative h-auto py-2 px-3 flex flex-col items-center gap-1 min-w-[70px]
                    bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30
                    transition-all duration-200
                    ${isBeingDraggedOver ? 'border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-500/50' : ''}
                `}
            >
                <span className="text-xl">{element.emoji}</span>
                <span className="text-[10px] text-white/70 truncate max-w-full">{element.name}</span>
            </Button>
        </motion.div>
    );
}

// Combination Result Animation
function CombinationResult({
    element,
    onComplete,
}: {
    element: DoodleElement;
    onComplete: () => void;
}) {
    // Auto-dismiss after animation plays
    useEffect(() => {
        const timer = setTimeout(onComplete, 2000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="relative flex flex-col items-center gap-2 p-6 rounded-xl bg-black/80 border border-white/20 backdrop-blur-lg"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
                {/* Shimmer effect */}
                <motion.div
                    className="absolute inset-0 rounded-xl overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: 2 }}
                >
                    <div
                        className="absolute inset-0"
                        style={{
                            background: "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)",
                            animation: "shimmer 0.6s ease-in-out infinite",
                        }}
                    />
                </motion.div>

                {/* Sparkle particles */}
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute"
                        initial={{
                            x: 0,
                            y: 0,
                            opacity: 1,
                            scale: 0
                        }}
                        animate={{
                            x: Math.cos(i * 45 * Math.PI / 180) * 80,
                            y: Math.sin(i * 45 * Math.PI / 180) * 80,
                            opacity: 0,
                            scale: 1
                        }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                    </motion.div>
                ))}

                <motion.span
                    className="text-5xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0]
                    }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    {element.emoji}
                </motion.span>
                <motion.span
                    className="text-lg font-semibold text-white"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    {element.name}
                </motion.span>
                <motion.span
                    className="text-xs text-emerald-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    ✨ Discovered!
                </motion.span>
            </motion.div>
        </motion.div>
    );
}

// Main Doodle God Panel
function DoodleGodPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [elements, setElements] = useState<DoodleElement[]>(initialElements);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);
    const [newDiscovery, setNewDiscovery] = useState<DoodleElement | null>(null);
    const [message, setMessage] = useState<string>("");

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const discoveredElements = elements.filter(e => e.discovered);
    const totalElements = elements.length;
    const activeElement = activeId ? elements.find(e => e.id === activeId) : null;

    const findRecipe = useCallback((elem1Id: string, elem2Id: string): string | null => {
        for (const recipe of recipes) {
            const [a, b] = recipe.inputs;
            if ((a === elem1Id && b === elem2Id) || (a === elem2Id && b === elem1Id)) {
                return recipe.output;
            }
        }
        return null;
    }, []);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (over && over.id !== activeId) {
            setOverId(over.id as string);
        } else {
            setOverId(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        const draggedId = active.id as string;
        const droppedOnId = over?.id as string | undefined;

        // Reset states
        setActiveId(null);
        setOverId(null);

        if (!droppedOnId || draggedId === droppedOnId) return;

        const outputId = findRecipe(draggedId, droppedOnId);

        if (outputId) {
            const outputElement = elements.find(e => e.id === outputId);
            if (outputElement) {
                if (!outputElement.discovered) {
                    // Discover new element
                    setElements(prev => prev.map(e =>
                        e.id === outputId ? { ...e, discovered: true } : e
                    ));
                    setNewDiscovery({ ...outputElement, discovered: true });
                    setMessage(`✨ Created ${outputElement.name}!`);
                } else {
                    setMessage(`${outputElement.emoji} ${outputElement.name} (already discovered)`);
                }
            }
        } else {
            setMessage("❌ No reaction...");
        }

        // Clear message after 2 seconds
        setTimeout(() => setMessage(""), 2000);
    };

    const handleDragCancel = () => {
        setActiveId(null);
        setOverId(null);
    };

    const handleElementClick = (element: DoodleElement) => {
        // Could expand to show hints or element info
        setMessage(`${element.emoji} ${element.name}`);
        setTimeout(() => setMessage(""), 1500);
    };

    if (!isOpen) return null;

    return (
        <>
            <AnimatePresence>
                {newDiscovery && (
                    <CombinationResult
                        element={newDiscovery}
                        onComplete={() => setNewDiscovery(null)}
                    />
                )}
            </AnimatePresence>

            <motion.div
                className="fixed right-0 top-0 bottom-0 w-[30%] min-w-[320px] bg-black/95 border-l border-white/10 backdrop-blur-xl z-40 flex flex-col"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            Element Forge
                        </h2>
                        <p className="text-xs text-white/40">
                            {discoveredElements.length} / {totalElements} discovered
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-white/50 hover:text-white hover:bg-white/10"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Progress bar */}
                <div className="px-4 py-2">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-white"
                            initial={{ width: 0 }}
                            animate={{ width: `${(discoveredElements.length / totalElements) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>

                {/* Instructions */}
                <div className="px-4 py-2 text-xs text-white/40 text-center">
                    Drag elements onto each other to combine!
                </div>

                {/* Message area */}
                <AnimatePresence mode="wait">
                    {message && (
                        <motion.div
                            className="px-4 py-2"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <div className={`text-center py-2 px-3 rounded-lg text-sm ${message.startsWith('✨')
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : message.startsWith('❌')
                                    ? 'bg-red-500/10 text-red-400/70 border border-red-500/20'
                                    : 'bg-white/5 text-white/70 border border-white/10'
                                }`}>
                                {message}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Elements Grid */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-4 gap-2 gapy-4">
                            {discoveredElements.map(element => (
                                <DraggableElement
                                    key={element.id}
                                    element={element}
                                    isBeingDraggedOver={overId === element.id}
                                    isDraggingThis={activeId === element.id}
                                    onClick={() => handleElementClick(element)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Drag Overlay */}
                    <DragOverlay dropAnimation={null}>
                        {activeElement && (
                            <Button
                                variant="outline"
                                className="h-auto py-2 px-3 flex flex-col items-center gap-1 min-w-[70px] bg-purple-500/30 border-purple-400 text-white scale-110 shadow-lg shadow-purple-500/30 cursor-grabbing"
                            >
                                <span className="text-xl">{activeElement.emoji}</span>
                                <span className="text-[10px] text-white/70">{activeElement.name}</span>
                            </Button>
                        )}
                    </DragOverlay>
                </DndContext>

                {/* Completion message */}
                {discoveredElements.length === totalElements && (
                    <motion.div
                        className="p-4 border-t border-white/10 bg-emerald-500/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <p className="text-center text-emerald-400 font-medium">
                            🎉 Congratulations! You discovered everything! 🎉
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </>
    );
}

interface GameData {
    href: string;
    title: string;
    description: string;
    tags: string[];
    playCount: number;
    highScore: number;
}

const games: GameData[] = [
    {
        href: "/snake",
        title: "Snake",
        description: "Classic snake game. Eat food, grow longer, don't hit walls or yourself!",
        tags: ["Classic", "Arcade"],
        playCount: 1247,
        highScore: 156,
    },
    {
        href: "/minesweeper",
        title: "Minesweeper",
        description: "Reveal tiles, use numbers to find mines. Left-click to reveal, right-click to flag.",
        tags: ["Classic", "Puzzle"],
        playCount: 892,
        highScore: 342,
    },
    {
        href: "/platformer",
        title: "Platformer",
        description: "Jump your way up! Collect coins and climb as high as you can.",
        tags: ["Classic", "Action"],
        playCount: 2103,
        highScore: 4820,
    },
    {
        href: "/snake-minesweeper",
        title: "Snake + Minesweeper",
        description: "Navigate a fog-of-war minesweeper grid as a snake. Use revealed numbers to avoid mines!",
        tags: ["Hybrid", "Puzzle"],
        playCount: 456,
        highScore: 89,
    },
    {
        href: "/snake-platformer",
        title: "Snake + Platformer",
        description: "You ARE the snake! Head has physics, body follows your path.",
        tags: ["Hybrid", "Action"],
        playCount: 678,
        highScore: 2340,
    },
    {
        href: "/doodle-god",
        title: "Doodle God",
        description: "Combine elements to create new ones. Start with 4, discover 46!",
        tags: ["Puzzle", "Discovery"],
        playCount: 1893,
        highScore: 46,
    },
];

export default function FinalDashboard() {
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    return (
        <>
            <Head>
                <title>Game Arcade | Dashboard</title>
                <meta name="description" content="Your personal game arcade dashboard" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.png" />
            </Head>

            <div className={`dark min-h-screen bg-black text-white transition-all duration-300 ${isPanelOpen ? 'mr-[30%]' : ''}`}>
                {/* Shimmer keyframes */}
                <style jsx global>{`
                    @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                `}</style>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-6 py-12">
                    {/* Hero Section */}
                    <motion.div
                        className="mb-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                            Welcome back
                        </h1>
                        <p className="text-lg text-white/50 max-w-2xl">
                            Your personal game arcade. Track your progress, compete on leaderboards,
                            and discover new games.
                        </p>
                    </motion.div>

                    {/* Games Section */}
                    <motion.div
                        className="mb-8 flex items-center justify-between"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight mb-1">Games</h2>
                            <p className="text-white/40 text-sm">Classic games and creative hybrids</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPanelOpen(!isPanelOpen)}
                            className={`bg-transparent border-white/20 text-white/70 hover:bg-white/10 hover:text-white gap-2 ${isPanelOpen ? 'bg-white/10 text-white' : ''}`}
                        >
                            Element Forge
                        </Button>
                    </motion.div>

                    {/* Games Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {games.map((game, index) => (
                            <AnimatedCard key={game.href} delay={0.5 + index * 0.1}>
                                <GameCard game={game} />
                            </AnimatedCard>
                        ))}
                    </div>

                    {/* Footer */}
                    <motion.footer
                        className="mt-16 pt-8 border-t border-white/10 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                    >
                        <p className="text-sm text-white/30">
                            Built with Next.js and Phaser. Use arrow keys to play games.
                        </p>
                    </motion.footer>
                </main>
            </div>

            {/* Doodle God Panel */}
            <AnimatePresence>
                {isPanelOpen && (
                    <DoodleGodPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
                )}
            </AnimatePresence>
        </>
    );
}

import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Play, ChevronRight, Sparkles, Zap, Target, Layers } from "lucide-react";

// Shimmer animation component
function Shimmer() {
    return (
        <motion.div
            className="absolute inset-0 -translate-x-full"
            animate={{
                translateX: ["-100%", "100%"],
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
                ease: "easeInOut",
            }}
            style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
            }}
        />
    );
}

interface GameCard {
    href: string;
    title: string;
    description: string;
    tags: string[];
    icon: React.ReactNode;
}

const classicGames: GameCard[] = [
    {
        href: "/snake",
        title: "Snake",
        description: "Classic snake game. Eat food, grow longer, don't hit walls or yourself!",
        tags: ["Classic", "Arcade"],
        icon: <Zap className="w-5 h-5" />
    },
    {
        href: "/minesweeper",
        title: "Minesweeper",
        description: "Reveal tiles, use numbers to find mines. Left-click to reveal, right-click to flag.",
        tags: ["Classic", "Puzzle"],
        icon: <Target className="w-5 h-5" />
    },
    {
        href: "/platformer",
        title: "Platformer",
        description: "Jump your way up! Collect coins and climb as high as you can.",
        tags: ["Classic", "Action"],
        icon: <Sparkles className="w-5 h-5" />
    },
];

const hybridGames: GameCard[] = [
    {
        href: "/snake-minesweeper",
        title: "Snake + Minesweeper",
        description: "Navigate a fog-of-war minesweeper grid as a snake. Use revealed numbers to avoid mines!",
        tags: ["Hybrid", "Puzzle"],
        icon: <Layers className="w-5 h-5" />
    },
    {
        href: "/snake-platformer",
        title: "Snake + Platformer",
        description: "You ARE the snake! Head has physics, body follows your path.",
        tags: ["Hybrid", "Action"],
        icon: <Layers className="w-5 h-5" />
    },
    {
        href: "/minesweeper-platformer",
        title: "Minesweeper + Platformer",
        description: "Platforms are minesweeper tiles! Stand on them to reveal numbers.",
        tags: ["Hybrid", "Puzzle"],
        icon: <Layers className="w-5 h-5" />
    },
    {
        href: "/doodle-god",
        title: "Doodle God",
        description: "Combine elements to create new ones. Start with 4, discover 46!",
        tags: ["Puzzle", "Discovery"],
        icon: <Sparkles className="w-5 h-5" />
    }
];

function GameCardComponent({ game, index }: { game: GameCard; index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
        >
            <Link href={game.href}>
                <Card className="bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 cursor-pointer group relative overflow-hidden h-full">
                    <Shimmer />
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white transition-colors">
                                    {game.icon}
                                </div>
                                <CardTitle className="text-white text-lg font-semibold">
                                    {game.title}
                                </CardTitle>
                            </div>
                            <motion.div
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                whileHover={{ scale: 1.1 }}
                            >
                                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
                                    <Play className="h-4 w-4 text-black ml-0.5" />
                                </div>
                            </motion.div>
                        </div>
                        <CardDescription className="text-white/40 text-sm leading-relaxed mt-2">
                            {game.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="flex items-center gap-2">
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
                    </CardContent>
                </Card>
            </Link>
        </motion.div>
    );
}

export default function Home() {
    return (
        <>
            <Head>
                <title>Game Arcade</title>
                <meta name="description" content="A collection of minimalist games with modern UI" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.png" />
            </Head>

            <div className="dark min-h-screen bg-black text-white">
                {/* Navigation */}
                <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <motion.div
                            className="flex items-center gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
                                <Gamepad2 className="h-5 w-5 text-black" />
                            </div>
                            <span className="text-lg font-semibold tracking-tight">Game Arcade</span>
                        </motion.div>

                        <motion.div
                            className="flex items-center gap-4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Link href="/final">
                                <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 gap-2">
                                    <Sparkles className="w-4 h-4 text-yellow-400" />
                                    Dashboard
                                </Button>
                            </Link>
                        </motion.div>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-6 py-12">
                    {/* Hero Section */}
                    <motion.div
                        className="mb-16 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
                            Game Arcade
                        </h1>
                        <p className="text-lg text-white/50 max-w-2xl mx-auto">
                            Classic games reimagined with a modern, minimalist aesthetic.
                            Clean black and white design with smooth animations.
                        </p>
                    </motion.div>

                    {/* Classic Games Section */}
                    <motion.div
                        className="mb-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight mb-1">Classic Games</h2>
                                <p className="text-white/40 text-sm">Timeless favorites with modern styling</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 mb-12">
                            {classicGames.map((game, index) => (
                                <GameCardComponent key={game.href} game={game} index={index} />
                            ))}
                        </div>
                    </motion.div>

                    {/* Hybrid Games Section */}
                    <motion.div
                        className="mb-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight mb-1">Hybrid Games</h2>
                                <p className="text-white/40 text-sm">Creative mashups and unique experiences</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {hybridGames.map((game, index) => (
                                <GameCardComponent key={game.href} game={game} index={index + 3} />
                            ))}
                        </div>
                    </motion.div>

                    {/* Footer */}
                    <motion.footer
                        className="mt-16 pt-8 border-t border-white/10 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                    >
                        <p className="text-sm text-white/30 mb-2">
                            Built with Next.js and Phaser. Designed with a Vercel-inspired aesthetic.
                        </p>
                        <p className="text-sm text-white/30">
                            Use arrow keys to play. Press SPACE to restart after game over.
                        </p>
                    </motion.footer>
                </main>
            </div>
        </>
    );
}

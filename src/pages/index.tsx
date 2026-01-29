import Head from "next/head";
import { Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

interface GameCard {
    href: string;
    title: string;
    description: string;
    emoji: string;
    tags: string[];
}

const games: GameCard[] = [
    {
        href: "/snake",
        title: "Snake",
        description: "Classic snake game. Eat food, grow longer, don't hit walls or yourself!",
        emoji: "🐍",
        tags: ["Classic", "Arcade"]
    },
    {
        href: "/minesweeper",
        title: "Minesweeper",
        description: "Reveal tiles, use numbers to find mines. Left-click to reveal, right-click to flag.",
        emoji: "💣",
        tags: ["Classic", "Puzzle"]
    },
    {
        href: "/platformer",
        title: "Platformer",
        description: "Jump your way up! Collect coins and climb as high as you can.",
        emoji: "🏃",
        tags: ["Classic", "Action"]
    },
    {
        href: "/snake-minesweeper",
        title: "Snake + Minesweeper",
        description: "Navigate a fog-of-war minesweeper grid as a snake. Use revealed numbers to avoid mines!",
        emoji: "🐍💣",
        tags: ["Hybrid", "Puzzle"]
    },
    {
        href: "/snake-platformer",
        title: "Snake + Platformer",
        description: "You ARE the snake! Head has physics, body follows your path. Don't get your tail stuck!",
        emoji: "🐍🏃",
        tags: ["Hybrid", "Action"]
    },
    {
        href: "/minesweeper-platformer",
        title: "Minesweeper + Platformer",
        description: "Platforms are minesweeper tiles! Stand on them to reveal numbers. Deduce safe jumps.",
        emoji: "💣🏃",
        tags: ["Hybrid", "Puzzle"]
    },
    {
        href: "/doodle-god",
        title: "Doodle God",
        description: "Combine elements to create new ones. Start with 4, discover 46! Drag and drop to combine.",
        emoji: "🔥💧",
        tags: ["Puzzle", "Discovery"]
    }
];

export default function Home() {
    return (
        <>
            <Head>
                <title>Game Arcade</title>
                <meta name="description" content="A collection of Phaser games including classics and creative hybrids" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.png" />
            </Head>
            <main className={inter.className} style={{
                minHeight: "100vh",
                backgroundColor: "#0a0a0a",
                padding: "40px 20px"
            }}>
                <div style={{
                    maxWidth: "1200px",
                    margin: "0 auto"
                }}>
                    <h1 style={{
                        fontSize: "48px",
                        color: "#ffffff",
                        textAlign: "center",
                        marginBottom: "8px"
                    }}>
                        🎮 Game Arcade
                    </h1>
                    <p style={{
                        fontSize: "18px",
                        color: "#888888",
                        textAlign: "center",
                        marginBottom: "48px"
                    }}>
                        Classic games and creative hybrids built with Phaser + Next.js
                    </p>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: "24px"
                    }}>
                        {games.map((game) => (
                            <Link
                                key={game.href}
                                href={game.href}
                                style={{
                                    textDecoration: "none",
                                    color: "inherit"
                                }}
                            >
                                <div style={{
                                    backgroundColor: "#1a1a2e",
                                    borderRadius: "12px",
                                    padding: "24px",
                                    border: "1px solid #2a2a4e",
                                    transition: "transform 0.2s, border-color 0.2s",
                                    cursor: "pointer"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-4px)";
                                    e.currentTarget.style.borderColor = "#4a4a8e";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.borderColor = "#2a2a4e";
                                }}
                                >
                                    <div style={{
                                        fontSize: "48px",
                                        marginBottom: "12px"
                                    }}>
                                        {game.emoji}
                                    </div>
                                    <h2 style={{
                                        fontSize: "24px",
                                        color: "#ffffff",
                                        marginBottom: "8px"
                                    }}>
                                        {game.title}
                                    </h2>
                                    <p style={{
                                        fontSize: "14px",
                                        color: "#aaaaaa",
                                        marginBottom: "16px",
                                        lineHeight: "1.5"
                                    }}>
                                        {game.description}
                                    </p>
                                    <div style={{
                                        display: "flex",
                                        gap: "8px",
                                        flexWrap: "wrap"
                                    }}>
                                        {game.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                style={{
                                                    fontSize: "12px",
                                                    color: "#888888",
                                                    backgroundColor: "#2a2a4e",
                                                    padding: "4px 8px",
                                                    borderRadius: "4px"
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <p style={{
                        fontSize: "14px",
                        color: "#666666",
                        textAlign: "center",
                        marginTop: "48px"
                    }}>
                        Use arrow keys to play. Press SPACE to restart after game over.
                    </p>
                </div>
            </main>
        </>
    );
}

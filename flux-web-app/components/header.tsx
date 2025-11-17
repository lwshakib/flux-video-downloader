import Image from "next/image";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-togle";
import { MobileMenu } from "@/components/mobile-menu";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-black/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/flux-colorful-logo.svg"
            alt="Flux logo"
            width={32}
            height={32}
            priority
          />
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            Flux
          </h1>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/youtube"
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Youtube
          </Link>
          <Link
            href="/facebook"
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Facebook
          </Link>
          <Link
            href="/facebook-private-video"
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Facebook Private Video
          </Link>
          <Link
            href="/tiktok"
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            TikTok
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <MobileMenu />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}


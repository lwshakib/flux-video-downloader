import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Youtube,
  Facebook,
  Lock,
  Music,
  Zap,
  Shield,
  Target,
} from "lucide-react";

export default function Home() {
  const platforms = [
    {
      name: "YouTube",
      description: "Download videos from YouTube with ease",
      href: "/youtube",
      icon: Youtube,
      color: "text-red-600 dark:text-red-400",
    },
    {
      name: "Facebook",
      description: "Extract videos from Facebook posts",
      href: "/facebook",
      icon: Facebook,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      name: "Facebook Private Video",
      description: "Download private Facebook videos",
      href: "/facebook-private-video",
      icon: Lock,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      name: "TikTok",
      description: "Save TikTok videos quickly",
      href: "/tiktok",
      icon: Music,
      color: "text-pink-600 dark:text-pink-400",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <Header />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black dark:text-zinc-50 mb-6">
              Download Videos from Any Platform
            </h1>
            <p className="text-xl sm:text-2xl text-zinc-600 dark:text-zinc-400 mb-12 max-w-2xl mx-auto">
              Flux is your all-in-one video downloader. Extract and save videos
              from YouTube, Facebook, TikTok, and more with just a few clicks.
            </p>
          </div>
        </section>

        {/* Platform Cards */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50 mb-8 text-center">
              Supported Platforms
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {platforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <Link
                    key={platform.name}
                    href={platform.href}
                    className="group bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div
                        className={`mb-4 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:scale-110 transition-transform duration-200 ${platform.color}`}
                      >
                        <Icon className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
                        {platform.name}
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {platform.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50 mb-8 text-center">
              Why Choose Flux?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                    <Zap className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-2">
                  Fast & Reliable
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Quick downloads with high success rates
                </p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/20">
                    <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-2">
                  Secure & Private
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Your data stays safe and private
                </p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/20">
                    <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-2">
                  Easy to Use
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Simple interface, no technical skills needed
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type CrawlerPageProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onCrawl: (url: string) => Promise<void>;
};

export function CrawlerPage({
  searchValue,
  onSearchValueChange,
  onCrawl,
}: CrawlerPageProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onCrawl(searchValue.trim());
    } catch (error) {
      console.error("Crawl failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      className="mt-6 flex flex-col gap-3 md:flex-row"
      onSubmit={handleSubmit}
    >
      <Input
        value={searchValue}
        onChange={(event) => onSearchValueChange(event.target.value)}
        placeholder="Paste the video URL here"
        className="h-11 flex-1"
        disabled={isLoading}
      />
      <Button
        type="submit"
        className="h-11"
        disabled={!searchValue.trim() || isLoading}
      >
        {isLoading ? "Crawling..." : "Crawl"}
      </Button>
    </form>
  );
}

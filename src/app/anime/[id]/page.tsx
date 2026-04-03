"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/blocks/navbar";
import { Footer } from "@/components/blocks/footer";
import { orpc } from "@/lib/query/orpc";
import { Spinner } from "@/components/ui/spinner";
import { useSavedSeries } from "@/hooks/use-saved-series";
import { useWatchProgress } from "@/hooks/use-watch-progress";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AnimeDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const {
    data: animeData,
    isLoading: infoLoading,
    error,
  } = useQuery(orpc.anime.getAboutInfo.queryOptions({ input: { id } }));

  const { isSaved, toggleSave } = useSavedSeries();
  const { getLastWatchedEpisode } = useWatchProgress();
  const lastWatched = getLastWatchedEpisode(id);

  if (error) {
    notFound();
  }

  const anime = animeData?.data;
  const relatedAnime = animeData?.relatedAnimes ?? [];
  const recommendedAnime = animeData?.recommendedAnimes ?? [];

  if (infoLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!anime) {
    notFound();
  }


  if (!anime.images || !anime.title) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-14">
        <div className="relative h-[50vh] overflow-hidden">
          <Image
            src={anime.images.webp.large_image_url}
            alt={anime.title_english}
            fill
            className="object-cover blur-sm scale-105"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
        </div>

        {/* Info */}
        <div className="relative -mt-32 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Cover */}
            <div className="relative w-40 md:w-52 aspect-3/4 rounded-lg overflow-hidden shadow-xl shrink-0">
              <Image
                src={anime.images.webp.large_image_url}
                alt={anime.title_english}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Details */}
            <div className="flex-1 pt-4 md:pt-20">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                {anime.type} · {anime.status} ·{" "}
                {typeof anime.aired === "string"
                  ? anime.aired.split(" to ")[0]
                  : typeof anime.aired === "object" && anime.aired?.prop?.from?.year
                  ? anime.aired.prop.from.year
                  : anime.aired?.[0]}
              </p>

              <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl text-foreground mb-2">
                {anime.title_english}
              </h1>

              {anime.title && (
                <p className="text-sm text-muted-foreground/60 mb-4">
                  {anime.title}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                {anime.episodes && (
                  <span>{anime.episodes} episodes</span>
                )}
                {anime.duration && <span>{anime.duration}</span>}
                {anime.studios[0]?.name && <span>{anime.studios[0].name}</span>}
                {anime.rating && (
                  <span className="text-yellow-500">{anime.rating}</span>
                )}
              </div>

              <div className="flex items-center gap-3 mb-6">
                <Link
                  href={`/watch/${id}/${lastWatched?.episodeNumber ?? 1}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {lastWatched
                    ? `Continue EP ${lastWatched.episodeNumber}`
                    : "Watch"}
                </Link>
                <button
                  onClick={() => {
                    const wasSaved = toggleSave({
                      id,
                      name: anime.title_english!,
                      poster: anime.images.webp.large_image_url!,
                    });
                    toast(wasSaved ? "Added to saved" : "Removed from saved");
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground/10 text-sm font-medium hover:bg-foreground/20 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill={isSaved(id) ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                  {isSaved(id) ? "Saved" : "Save"}
                </button>
              </div>

              {Array.isArray(anime.genres) && (
                <div className="flex flex-wrap gap-2">
                  {anime.genres.map((genre) => (
                    <span
                      key={genre.name}
                      className="px-3 py-1 rounded-full bg-foreground/5 text-xs text-muted-foreground"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Synopsis & Episodes */}
      <section className="py-10 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Synopsis */}
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  Synopsis
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {anime.synopsis || "No description available."}
                </p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-foreground/[0.02] rounded-xl p-5 border border-border">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  Information
                </h3>
                <dl className="space-y-3 text-sm">
                  {anime.type && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground/60">Type</dt>
                      <dd>{anime.type}</dd>
                    </div>
                  )}
                  {anime.episodes && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground/60">Episodes</dt>
                      <dd>
                        {anime.episodes}
                      </dd>
                    </div>
                  )}
                  {anime.status && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground/60">Status</dt>
                      <dd>{anime.status}</dd>
                    </div>
                  )}
                  {anime.aired.string && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground/60">Aired</dt>
                      <dd className="text-right max-w-32 truncate">
                        {anime.aired.string}
                      </dd>
                    </div>
                  )}
                  {anime.duration && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground/60">Duration</dt>
                      <dd>{anime.duration}</dd>
                    </div>
                  )}
                  {anime.studios && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground/60">Studio</dt>
                      <dd>{anime.studios[0]?.name}</dd>
                    </div>
                  )}
                  {anime.score && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground/60">MAL Score</dt>
                      <dd>{anime.score}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related */}
      {relatedAnime.length > 0 && (
        <section className="py-10 px-4 border-t border-border">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
              Related Anime
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {relatedAnime
                .filter(
                  (
                    item,
                  ): item is typeof item & {
                    id: string;
                    poster: string;
                    name: string;
                  } =>
                    item.id !== null &&
                    item.poster !== null &&
                    item.name !== null,
                )
                .slice(0, 6)
                .map((item) => (
                  <Link
                    key={item.id}
                    href={`/anime/${item.id}`}
                    className="group block"
                  >
                    <div className="relative aspect-3/4 rounded-lg overflow-hidden bg-foreground/5">
                      <Image
                        src={item.poster}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <h3 className="mt-2 text-sm text-muted-foreground line-clamp-1 group-hover:text-foreground transition-colors">
                      {item.name}
                    </h3>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Recommendations */}
      {recommendedAnime.length > 0 && (
        <section className="py-10 px-4 border-t border-border">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
              You may also like
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {recommendedAnime
                .filter(
                  (
                    item,
                  ): item is typeof item & {
                    id: string;
                    poster: string;
                    name: string;
                  } =>
                    item.id !== null &&
                    item.poster !== null &&
                    item.name !== null,
                )
                .slice(0, 6)
                .map((item) => (
                  <Link
                    key={item.id}
                    href={`/anime/${item.id}`}
                    className="group block"
                  >
                    <div className="relative aspect-3/4 rounded-lg overflow-hidden bg-foreground/5">
                      <Image
                        src={item.poster}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <h3 className="mt-2 text-sm text-muted-foreground line-clamp-1 group-hover:text-foreground transition-colors">
                      {item.name}
                    </h3>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

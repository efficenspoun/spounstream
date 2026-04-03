import { os } from "@orpc/server";
import { z } from "zod";
import { getAniwatchScraper } from "@/lib/aniwatch/scraper";
import type { HiAnime } from "aniwatch";
import ky from "ky";


const scraper = getAniwatchScraper();

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

const animeIdSchema = z.object({
  id: z.string().min(1),
});

const episodeIdSchema = z.object({
  episodeId: z.string().min(1),
});

const searchSchema = z.object({
  query: z.string().min(1),
  page: z.number().optional().default(1),
  filters: z
    .object({
      type: z.string().optional(),
      status: z.string().optional(),
      rated: z.string().optional(),
      score: z.string().optional(),
      season: z.string().optional(),
      language: z.string().optional(),
      genres: z.string().optional(),
      sort: z.string().optional(),
    })
    .optional(),
});

const azListLetters = [
  "all",
  "other",
  "0-9",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
] as const;

const azListSchema = z.object({
  letter: z.enum(azListLetters),
  page: z.number().optional().default(1),
});

const animeServers = [
  "hd-1",
  "hd-2",
  "megacloud",
  "streamsb",
  "streamtape",
] as const;

const episodeSourcesSchema = z.object({
  episodeId: z.string().min(1),
  server: z.enum(animeServers).optional().default("hd-2"),
  category: z.enum(["sub", "dub", "raw"]).optional().default("sub"),
});

const animeCategories = [
  "most-favorite",
  "most-popular",
  "subbed-anime",
  "dubbed-anime",
  "recently-updated",
  "recently-added",
  "top-upcoming",
  "top-airing",
  "movie",
  "special",
  "ova",
  "ona",
  "tv",
  "completed",
] as const;

const categorySchema = z.object({
  category: z.enum(animeCategories),
  page: z.number().optional().default(1),
});

const scheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const genreSchema = z.object({
  genre: z.string().min(1),
  page: z.number().optional().default(1),
});

export const getHomePage = os.handler(async () => {
  //console.log("Fetching home page data from Jikan API...");
  const data = await ky.get("https://api.jikan.moe/v4/top/anime").json();
  //console.log("Home page data received:", data);
  return data;
});

export const getAZList = os.input(azListSchema).handler(async ({ input }) => {
  // Using Jikan API for A-Z list - this might need adjustment based on Jikan's capabilities
  const data = await ky.get("https://api.jikan.moe/v4/anime", {
    searchParams: {
      letter: input.letter === "all" ? undefined : input.letter,
      page: input.page.toString(),
    },
  }).json();
  return data;
});

export const getAnimeAboutInfo = os
  .input(animeIdSchema)
  .handler(async ({ input }) => {
    const data = await ky.get(`https://api.jikan.moe/v4/anime/${input.id}`).json();
    return data;
  });

export const getAnimeSearchResults = os
  .input(searchSchema)
  .handler(async ({ input }) => {
    const data = await ky.get("https://api.jikan.moe/v4/anime", {
      searchParams: {
        q: input.query,
        page: input.page.toString(),
        type: input.filters?.type,
        status: input.filters?.status,
        rating: input.filters?.rated,
        score: input.filters?.score,
      },
    }).json();
    return data;
  });

export const getEpisodes = os
  .input(animeIdSchema)
  .handler(async ({ input }) => {
    const data = await ky.get(`https://api.jikan.moe/v4/anime/${input.id}/episodes`).json();
    return data;
  });

export const getEpisodeServers = os
  .input(episodeIdSchema)
  .handler(async ({ input }): Promise<HiAnime.ScrapedEpisodeServers> => {
    const data = await withTimeout(
      scraper.getEpisodeServers(input.episodeId),
      6000,
      "getEpisodeServers",
    );
    return data;
  });

export const getEpisodeSources = os.input(episodeSourcesSchema).handler(
  async ({
    input,
  }): Promise<
    HiAnime.ScrapedAnimeEpisodesSources & {
      anilistID: number | null;
      malID: number | null;
    }
  > => {
    const data = await withTimeout(
      scraper.getEpisodeSources(
        input.episodeId,
        input.server,
        input.category,
      ),
      8000,
      "getEpisodeSources",
    );
    return data;
  },
);

export const getCategoryAnime = os
  .input(categorySchema)
  .handler(async ({ input }) => {
    let endpoint = "https://api.jikan.moe/v4/top/anime";
    const params: Record<string, string> = {};

    switch (input.category) {
      case "top-airing":
        params.filter = "airing";
        break;
      case "top-upcoming":
        params.filter = "upcoming";
        break;
      case "most-popular":
        params.filter = "bypopularity";
        break;
      case "most-favorite":
        params.filter = "favorite";
        break;
      default:
        // For other categories, use seasonal or top anime
        if (input.category === "tv" || input.category === "movie" || input.category === "ova" || input.category === "special" || input.category === "ona") {
          endpoint = "https://api.jikan.moe/v4/anime";
          params.type = input.category.toUpperCase();
        } else {
          // Default to top anime
          params.filter = "airing";
        }
    }

    params.page = input.page.toString();

    const data = await ky.get(endpoint, { searchParams: params }).json();
    return data;
  });

export const getEstimatedSchedule = os
  .input(scheduleSchema)
  .handler(async ({ input }) => {
    const data = await ky.get("https://api.jikan.moe/v4/schedules", {
      searchParams: {
        date: input.date,
      },
    }).json();
    return data;
  });

export const getGenreAnime = os
  .input(genreSchema)
  .handler(async ({ input }) => {
    const data = await ky.get("https://api.jikan.moe/v4/anime", {
      searchParams: {
        genres: input.genre,
        page: input.page.toString(),
      },
    }).json();
    return data;
  });

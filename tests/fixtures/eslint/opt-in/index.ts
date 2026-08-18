interface Group {
  items: string[];
}

interface SearchOptions {
  direction: "asc" | "desc";
  limit: number;
  page: number;
  query: string;
  sort: string;
}

type SearchRequest = SearchOptions;

const supportedTypes = new Set(["asset", "page", "post", "video"]);
const tones = new Map([
  ["archived", "negative"],
  ["draft", "neutral"],
  ["pending", "neutral"],
  ["ready", "positive"],
]);

export function buildSearchRequest(options: SearchOptions): SearchRequest {
  return {
    direction: options.direction,
    limit: options.limit,
    page: options.page,
    query: options.query,
    sort: options.sort,
  };
}

export function getLabel(value: string | null): string {
  if (!value) {
    return "missing";
  }

  return value;
}

export function isSupported(type: string): boolean {
  if (!supportedTypes.has(type)) {
    return false;
  }

  return true;
}

export function flattenGroups(groups: Group[]): string[] {
  return groups.flatMap((group) => group.items);
}

export function getTone(status: string): string {
  return tones.get(status) ?? "negative";
}

export async function getReady(request: () => Promise<boolean>) {
  const ready = await request();
  if (!ready) {
    return false;
  }

  return ready;
}

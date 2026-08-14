// Explain the catalog policy.
interface Group {
  items: string[];
}

interface SearchRequest {
  direction: "asc" | "desc";
  limit: number;
  page: number;
  query: string;
  sort: string;
}

export function buildSearchRequest(
  query: string,
  page: number,
  limit: number,
  sort: string,
  direction: "asc" | "desc",
): SearchRequest {
  return { direction, limit, page, query, sort };
}

export function getLabel(value: string | null): string {
  if (!value) {
    return "missing";
  } else {
    return value;
  }
}

export function isSupported(type: string): boolean {
  return type === "page" || type === "post" || type === "asset";
}

export function flattenGroups(groups: Group[]): string[] {
  return groups.map((group) => group.items).flat();
}

export function getTone(status: string): string {
  return status === "ready"
    ? "positive"
    : status === "pending"
      ? "neutral"
      : "negative";
}

export function copyNames(names: string[]): string[] {
  return names.map((name) => name);
}

export async function getReady() {
  return await Promise.resolve(true);
}

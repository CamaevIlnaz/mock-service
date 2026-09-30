function splitSegments(path: string): string[] {
  return path.split('/').filter((segment) => segment.length > 0);
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

/**
 * Сопоставляет path запроса с маской правила.
 * `:param` — ровно один сегмент, `*` — любой остаток (в том числе пустой).
 * Trailing slash не учитывается.
 */
export function matchUrlMask(mask: string, path: string): boolean {
  const maskSegments = splitSegments(mask.trim());
  const pathSegments = splitSegments(path).map(safeDecode);

  for (let i = 0; i < maskSegments.length; i++) {
    const maskSegment = maskSegments[i];

    if (maskSegment === '*') {
      return true;
    }

    const pathSegment = pathSegments[i];
    if (pathSegment === undefined) {
      return false;
    }

    if (maskSegment.startsWith(':')) {
      continue;
    }

    if (maskSegment !== pathSegment) {
      return false;
    }
  }

  return maskSegments.length === pathSegments.length;
}

/**
 * Собирает URL стенда: `domain` + `basePath` + `path` + `search`.
 * Бросает TypeError, если `domain` не является абсолютным URL.
 */
export function joinUrl(
  domain: string,
  basePath: string,
  path: string,
  search: string,
): string {
  const url = new URL(domain.trim());

  const joined = [url.pathname, basePath, path]
    .map(trimSlashes)
    .filter((part) => part.length > 0)
    .join('/');

  const keepTrailingSlash = path.length > 1 && path.endsWith('/');
  url.pathname = `/${joined}${keepTrailingSlash && joined ? '/' : ''}`;
  url.search = search;

  return url.toString();
}

/**
 * Разбирает исходный URL `/mockapi/{token}/rest?query` на path после токена и query.
 */
export function splitMockApiUrl(rawUrl: string): {
  path: string;
  search: string;
} {
  const prefix = '/mockapi/';
  const afterPrefix = rawUrl.startsWith(prefix)
    ? rawUrl.slice(prefix.length)
    : rawUrl;

  const tokenEnd = afterPrefix.search(/[/?]/);
  const rest = tokenEnd === -1 ? '' : afterPrefix.slice(tokenEnd);

  const queryIndex = rest.indexOf('?');
  const path = queryIndex === -1 ? rest : rest.slice(0, queryIndex);
  const search = queryIndex === -1 ? '' : rest.slice(queryIndex);

  return { path: path || '/', search };
}

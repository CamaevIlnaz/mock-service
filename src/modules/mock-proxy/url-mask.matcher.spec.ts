import { joinUrl, matchUrlMask, splitMockApiUrl } from './url-mask.matcher';

describe('matchUrlMask', () => {
  it.each([
    ['/products', '/products', true],
    ['/products', '/products/', true],
    ['/products/', '/products', true],
    ['/products', '/orders', false],
    ['/products', '/products/1', false],
    ['/products/:id', '/products/42', true],
    ['/products/:id', '/products', false],
    ['/products/:id', '/products/42/reviews', false],
    ['/products/:id/reviews', '/products/42/reviews', true],
    ['/products/*', '/products', true],
    ['/products/*', '/products/1/2/3', true],
    ['*', '/anything/here', true],
    ['/users/:name', '/users/%D0%98%D0%B2%D0%B0%D0%BD', true],
    ['/users/Иван', '/users/%D0%98%D0%B2%D0%B0%D0%BD', true],
    ['/', '/', true],
  ])('маска %s и path %s -> %s', (mask, path, expected) => {
    expect(matchUrlMask(mask, path)).toBe(expected);
  });
});

describe('joinUrl', () => {
  it('склеивает domain, basePath и path', () => {
    expect(
      joinUrl('https://dev.example.com', '/api', '/products', '?page=1'),
    ).toBe('https://dev.example.com/api/products?page=1');
  });

  it('нормализует лишние слэши', () => {
    expect(joinUrl('https://dev.example.com/', '/api/', '/products', '')).toBe(
      'https://dev.example.com/api/products',
    );
  });

  it('работает с пустым basePath и корневым path', () => {
    expect(joinUrl('https://dev.example.com', '/', '/', '')).toBe(
      'https://dev.example.com/',
    );
  });

  it('сохраняет path из domain и trailing slash из path', () => {
    expect(joinUrl('https://dev.example.com/gw', 'v1', '/products/', '')).toBe(
      'https://dev.example.com/gw/v1/products/',
    );
  });

  it('бросает ошибку для domain без схемы', () => {
    expect(() => joinUrl('dev.example.com', '/api', '/x', '')).toThrow();
  });
});

describe('splitMockApiUrl', () => {
  it.each([
    ['/mockapi/abc/products?page=1', '/products', '?page=1'],
    ['/mockapi/abc/products/1/', '/products/1/', ''],
    ['/mockapi/abc', '/', ''],
    ['/mockapi/abc/', '/', ''],
    ['/mockapi/abc?x=1', '/', '?x=1'],
  ])('%s -> path %s, search %s', (rawUrl, path, search) => {
    expect(splitMockApiUrl(rawUrl)).toEqual({ path, search });
  });
});

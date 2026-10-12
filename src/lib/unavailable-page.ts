// Self-contained HTML for the public /[code] route. Route handlers can't
// render a React page with a chosen status, and the root layout loads no
// stylesheet, so the styles are inline. All strings here are static.
function page(status: number, heading: string, message: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${heading}</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
    font-family: system-ui, sans-serif; background: #fafafa; color: #111; }
  main { max-width: 28rem; padding: 1.5rem; text-align: center; }
  .code { font-size: 4rem; font-weight: 700; color: #bbb; margin: 0; }
  h1 { font-size: 1.5rem; margin: .5rem 0; }
  p { color: #555; line-height: 1.5; }
  @media (prefers-color-scheme: dark) {
    body { background: #111; color: #eee; } p { color: #aaa; } .code { color: #555; }
  }
</style>
</head>
<body>
<main>
  <p class="code">${status}</p>
  <h1>${heading}</h1>
  <p>${message}</p>
</main>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export function notFoundPage(): Response {
  return page(
    404,
    "Link not found",
    "This short link doesn't exist. Check the address for typos and try again.",
  );
}

export function goneLinkPage(): Response {
  return page(
    410,
    "This link is no longer available",
    "The owner has turned this link off, or it has expired.",
  );
}

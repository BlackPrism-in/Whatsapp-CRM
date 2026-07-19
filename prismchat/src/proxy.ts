import { auth } from "@/auth";

// Next.js 16 renamed `middleware` → `proxy` (nodejs runtime only).
// Gates the authenticated app and admin areas.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isProtected =
    pathname.startsWith("/app") || pathname.startsWith("/admin");

  if (isProtected && !isLoggedIn) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};

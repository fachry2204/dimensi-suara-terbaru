import { NextRequest, NextResponse } from "next/server";

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/user-status",
  "/reset-password",
];

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );

  const sessionToken = request.cookies.get("dimensi_session")?.value;

  if (!isPublicRoute && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  }

  // If user already has a session and tries to access /login, send them to their dashboard
  if (isPublicRoute && sessionToken && pathname === "/login") {
    // Check redirect param first
    const redirectTo = request.nextUrl.searchParams.get("redirect");
    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("/login")) {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return NextResponse.redirect(new URL("/user/my-releases", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|uploads|favicon.ico|.*\\..*).*)",
  ],
};

import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const isPublicApiRoute = pathname.startsWith("/api/")
    const isExtensionBridge = pathname === "/auth/extension-bridge"
    const isPublicPage = pathname === "/" || pathname === "/privacy"

    if (
      !user &&
      !isPublicApiRoute &&
      !pathname.startsWith("/auth") &&
      !isPublicPage
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    if (
      user &&
      !isPublicApiRoute &&
      !isExtensionBridge &&
      (pathname.startsWith("/auth") ||
        pathname === "/")
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  } catch {
    // Fail closed for protected routes when auth/session lookup fails.
    const pathname = request.nextUrl.pathname
    if (
      !pathname.startsWith("/api/") &&
      !pathname.startsWith("/auth") &&
      pathname !== "/" &&
      pathname !== "/privacy"
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/error"
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

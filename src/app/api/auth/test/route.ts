import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies as nextCookies } from "next/headers";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export async function GET(request: NextRequest) {
  try {
    console.log("GET /api/auth/test called");

    // ✅ Force type correction for cookies()
    const cookieStore = (await (nextCookies() as any)) as ReadonlyRequestCookies;

    const allCookies = cookieStore.getAll();
    console.log(
      "All cookies:",
      allCookies.map((c: { name: string; value: string }) => ({
        name: c.name,
        hasValue: !!c.value,
      }))
    );

    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: { name: string; value: string; options?: any }[]) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Ignore set errors
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    console.log("Auth test - User:", user?.id, "Error:", authError);

    return NextResponse.json({
      authenticated: !!user,
      userId: user?.id,
      email: user?.email,
      error: authError?.message,
      cookies: allCookies.map((c) => c.name),
    });
  } catch (error: any) {
    console.error("Auth test error:", error);
    return NextResponse.json(
      { error: "Test failed", details: error.message },
      { status: 500 }
    );
  }
}

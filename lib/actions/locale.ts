"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

/**
 * Switches the site language by setting the locale cookie and
 * re-rendering the whole layout tree.
 */
export async function setLocale(locale: string) {
    if (!isLocale(locale)) return;

    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE, locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
    });

    revalidatePath("/", "layout");
}

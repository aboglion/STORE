import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import {
    DEFAULT_LOCALE,
    isLocale,
    LOCALE_COOKIE,
    type Locale,
} from "@/lib/i18n/config";

import heMessages from "@/messages/he.json";
import arMessages from "@/messages/ar.json";

const messagesMap: Record<Locale, typeof heMessages> = {
    he: heMessages,
    ar: arMessages,
};

export default getRequestConfig(async () => {
    // Cookie-based locale (set by middleware on first visit, or by the
    // setLocale action). No URL prefixes are used.
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

    return {
        locale,
        messages: messagesMap[locale] ?? heMessages,
    };
});

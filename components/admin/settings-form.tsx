"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Accessibility, Building2, Loader2, Palette, Store } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { updateSettings } from "@/lib/actions/settings";
import { agorotToShekelInput } from "@/lib/utils/currency";
import { STORE_THEMES } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
    settingsFormSchema,
    type SettingsFormValues,
} from "@/lib/validations/settings";
import type { AppSettings, StoreThemeKey } from "@/types/database.types";

import { LogoUploader } from "./logo-uploader";

export function SettingsForm({ settings }: { settings: AppSettings }) {
    const router = useRouter();
    const t = useTranslations("admin.settings");
    const tv = useTranslations("validation");
    const [pending, startTransition] = useTransition();

    const schema = useMemo(() => settingsFormSchema(tv), [tv]);

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            store_name: settings.store_name,
            store_name_ar: settings.store_name_ar,
            logo_url: settings.logo_url,
            theme: settings.theme,
            delivery_fee_shekels: agorotToShekelInput(settings.delivery_fee_agorot),
            free_delivery_threshold_shekels: agorotToShekelInput(
                settings.free_delivery_threshold_agorot
            ),
            low_stock_threshold_default: settings.low_stock_threshold_default,
            contact_phone: settings.contact_phone,
            legal_business_name: settings.legal_business_name || "",
            business_id: settings.business_id || "",
            business_address: settings.business_address || "",
            business_email: settings.business_email || "",
            business_hours: settings.business_hours || "",
            accessibility_officer_name: settings.accessibility_officer_name || "",
            accessibility_officer_phone: settings.accessibility_officer_phone || "",
            accessibility_officer_email: settings.accessibility_officer_email || "",
        },
    });

    function onSubmit(values: SettingsFormValues) {
        startTransition(async () => {
            const res = await updateSettings(values);
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success(t("savedToast"));
            router.refresh();
        });
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid max-w-2xl gap-6"
            >
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Store className="size-4 text-primary" />
                    {t("storeIdentity")}
                </div>

                <FormField
                    control={form.control}
                    name="store_name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("storeName")}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t("storeNamePlaceholder")}
                                    className="h-11 rounded-xl"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                {t("storeNameDesc")}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="store_name_ar"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("storeNameAr")}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="متجري"
                                    className="h-11 rounded-xl"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="logo_url"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("storeLogo")}</FormLabel>
                            <FormControl>
                                <LogoUploader
                                    value={field.value}
                                    storeName={form.watch("store_name") || t("storeNamePlaceholder")}
                                    onChange={(path) =>
                                        form.setValue("logo_url", path, {
                                            shouldDirty: true,
                                        })
                                    }
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Separator className="my-1" />

                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Palette className="size-4 text-primary" />
                    {t("theme")}
                </div>

                <FormField
                    control={form.control}
                    name="theme"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("siteColors")}</FormLabel>
                            <FormControl>
                                <RadioGroup
                                    value={field.value}
                                    onValueChange={(value) =>
                                        field.onChange(value as StoreThemeKey)
                                    }
                                    className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                                >
                                    {Object.entries(STORE_THEMES).map(
                                        ([key, theme]) => {
                                            const selected = field.value === key;
                                            const themeLabel = t(`themes.${key}`);
                                            const themeDesc = t(`themes.${key}Desc`);
                                            return (
                                                <div key={key}>
                                                    <RadioGroupItem
                                                        value={key}
                                                        id={`theme-${key}`}
                                                        className="peer sr-only"
                                                    />
                                                    <Label
                                                        htmlFor={`theme-${key}`}
                                                        className={cn(
                                                            "flex cursor-pointer flex-col gap-2 rounded-2xl border p-3 transition-all duration-150 active:scale-[0.98] peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
                                                            selected
                                                                ? "border-primary bg-primary/5 shadow-soft"
                                                                : "border-border/70 bg-card hover:border-primary/40"
                                                        )}
                                                    >
                                                        <span className="flex items-center gap-1.5">
                                                            <span
                                                                className="size-5 rounded-full border border-black/10 shadow-sm"
                                                                style={{
                                                                    backgroundColor:
                                                                        theme.swatches[1],
                                                                }}
                                                            />
                                                            <span
                                                                className="size-5 rounded-full border border-black/10"
                                                                style={{
                                                                    backgroundColor:
                                                                        theme.swatches[0],
                                                                }}
                                                            />
                                                        </span>
                                                        <span className="text-sm font-semibold">
                                                            {themeLabel}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {themeDesc}
                                                        </span>
                                                    </Label>
                                                </div>
                                            );
                                        }
                                    )}
                                </RadioGroup>
                            </FormControl>
                            <FormDescription>
                                {t("themeDesc")}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Separator className="my-1" />

                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Store className="size-4 text-primary" />
                    {t("shippingInventory")}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="delivery_fee_shekels"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("deliveryFee")}</FormLabel>
                                <FormControl>
                                    <Input placeholder="15" dir="ltr" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="free_delivery_threshold_shekels"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("freeDeliveryThreshold")}</FormLabel>
                                <FormControl>
                                    <Input placeholder="200" dir="ltr" {...field} />
                                </FormControl>
                                <FormDescription>
                                    {t("freeDeliveryDesc")}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="low_stock_threshold_default"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("lowStockDefault")}</FormLabel>
                            <FormControl>
                                <Input type="number" min={0} {...field} />
                            </FormControl>
                            <FormDescription>
                                {t("lowStockDefaultDesc")}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="contact_phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("contactPhone")}</FormLabel>
                            <FormControl>
                                <Input placeholder="03-0000000" dir="ltr" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Separator />

                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Building2 className="size-4 text-primary" />
                    <span>פרטי העסק כחוק (התאמה לדין בישראל)</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="legal_business_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>שם העסק הרשמי (עוסק / חברה)</FormLabel>
                                <FormControl>
                                    <Input placeholder="לדוגמה: מאפיית הבוטיק בע״מ" {...field} />
                                </FormControl>
                                <FormDescription>השם המופיע בתעודת ההתאגדות / רישום העסק</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="business_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>מספר ח.פ / ע.מ / ח.צ</FormLabel>
                                <FormControl>
                                    <Input placeholder="516000000" dir="ltr" {...field} />
                                </FormControl>
                                <FormDescription>מספר זיהוי מס של העסק בישראל</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="business_address"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>כתובת פיזית של העסק</FormLabel>
                                <FormControl>
                                    <Input placeholder="רחוב הרצל 1, תל אביב-יפו" {...field} />
                                </FormControl>
                                <FormDescription>חובה לציון בתקנון, בחשבוניות ובהודעות ביטול</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="business_email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>דוא״ל שירות לקוחות רשמי</FormLabel>
                                <FormControl>
                                    <Input placeholder="support@store.co.il" dir="ltr" {...field} />
                                </FormControl>
                                <FormDescription>לפניות צרכנים והודעות ביטול עסקה</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="business_hours"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>שעות פעילות שירות הלקוחות</FormLabel>
                            <FormControl>
                                <Input placeholder="א׳-ה׳ 08:00-20:00, ו׳ 08:00-14:00" {...field} />
                            </FormControl>
                            <FormDescription>שעות מענה וקבלת קהל כחוק</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Separator />

                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Accessibility className="size-4 text-primary" />
                    <span>פרטי רכז נגישות (חוק שוויון זכויות ות״י 5568)</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                        control={form.control}
                        name="accessibility_officer_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>שם רכז/ת הנגישות</FormLabel>
                                <FormControl>
                                    <Input placeholder="שירות לקוחות ונגישות" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="accessibility_officer_phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>טלפון רכז/ת הנגישות</FormLabel>
                                <FormControl>
                                    <Input placeholder="03-0000000" dir="ltr" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="accessibility_officer_email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>דוא״ל רכז/ת הנגישות</FormLabel>
                                <FormControl>
                                    <Input placeholder="accessibility@store.co.il" dir="ltr" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div>
                    <Button type="submit" disabled={pending} size="lg">
                        {pending && <Loader2 className="size-4 animate-spin" />}
                        {t("saveSettings")}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

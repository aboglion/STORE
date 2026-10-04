"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { updateSettings } from "@/lib/actions/settings";
import { agorotToShekelInput } from "@/lib/utils/currency";
import {
    settingsFormSchema,
    type SettingsFormValues,
} from "@/lib/validations/settings";
import type { AppSettings } from "@/types/database.types";

export function SettingsForm({ settings }: { settings: AppSettings }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsFormSchema),
        defaultValues: {
            store_name: settings.store_name,
            delivery_fee_shekels: agorotToShekelInput(settings.delivery_fee_agorot),
            free_delivery_threshold_shekels: agorotToShekelInput(
                settings.free_delivery_threshold_agorot
            ),
            low_stock_threshold_default: settings.low_stock_threshold_default,
            contact_phone: settings.contact_phone,
        },
    });

    function onSubmit(values: SettingsFormValues) {
        startTransition(async () => {
            const res = await updateSettings(values);
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success("ההגדרות נשמרו");
            router.refresh();
        });
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid max-w-xl gap-6"
            >
                <FormField
                    control={form.control}
                    name="store_name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>שם החנות</FormLabel>
                            <FormControl>
                                <Input placeholder="החנות שלי" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="delivery_fee_shekels"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>דמי משלוח (₪)</FormLabel>
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
                                <FormLabel>סף משלוח חינם (₪)</FormLabel>
                                <FormControl>
                                    <Input placeholder="200" dir="ltr" {...field} />
                                </FormControl>
                                <FormDescription>
                                    מעל סכום זה המשלוח חינם
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
                            <FormLabel>סף מלאי נמוך ברירת מחדל</FormLabel>
                            <FormControl>
                                <Input type="number" min={0} {...field} />
                            </FormControl>
                            <FormDescription>
                                משמש כערך ברירת מחדל למוצרים חדשים
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
                            <FormLabel>טלפון ליצירת קשר</FormLabel>
                            <FormControl>
                                <Input placeholder="03-0000000" dir="ltr" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div>
                    <Button type="submit" disabled={pending}>
                        {pending && <Loader2 className="size-4 animate-spin" />}
                        שמירת הגדרות
                    </Button>
                </div>
            </form>
        </Form>
    );
}
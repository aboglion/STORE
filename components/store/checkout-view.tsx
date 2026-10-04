"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LocateFixed, MapPin, ShoppingCart } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/cart-context";
import { createOrder } from "@/lib/actions/orders";
import { getCartProductDetails } from "@/lib/actions/storefront";
import { formatILS } from "@/lib/utils/currency";
import {
    checkoutSchema,
    type CheckoutFormValues,
} from "@/lib/validations/checkout";
import type { CheckoutPayload } from "@/lib/validations/checkout";

export function CheckoutView() {
    const router = useRouter();
    const { items, clear } = useCart();
    const [pending, startTransition] = useTransition();
    const [locating, setLocating] = useState(false);
    const [details, setDetails] = useState<Awaited<
        ReturnType<typeof getCartProductDetails>
    >>([]);

    const form = useForm<CheckoutFormValues>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: {
            full_name: "",
            phone: "",
            address: { full_address: "", city: "" },
            payment_method: "cash",
            customer_notes: "",
            lat: null,
            lng: null,
            location_source: "manual",
        },
    });

    const orderItems = items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));

    useEffect(() => {
        const ids = items.map((i) => i.product_id);
        if (ids.length === 0) {
            setDetails([]);
            return;
        }
        startTransition(async () => {
            const result = await getCartProductDetails(ids);
            setDetails(result);
        });
    }, [items]);

    function handleGeolocation() {
        if (!navigator.geolocation) {
            toast.error("הדפדפן אינו תומך באיתור מיקום");
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                form.setValue("lat", position.coords.latitude);
                form.setValue("lng", position.coords.longitude);
                form.setValue("location_source", "browser_geolocation");
                toast.success("המיקום נקלט בהצלחה");
                setLocating(false);
            },
            () => {
                toast.error("לא ניתן היה לאתר את המיקום — נא למלא כתובת ידנית");
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    function onSubmit(values: CheckoutFormValues) {
        const payload: CheckoutPayload = {
            customer: values,
            items: orderItems,
        };

        startTransition(async () => {
            const res = await createOrder(payload);
            if (!res.ok) {
                toast.error(res.error ?? "יצירת ההזמנה נכשלה");
                return;
            }
            clear();
            router.push(`/order-success/${res.orderNumber}?total=${res.totalAgorot}`);
        });
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
                <ShoppingCart className="size-12 text-muted-foreground" />
                <div>
                    <h2 className="text-lg font-semibold">הסל ריק</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        אין מה לבצע צ'קאאוט — חזור לקטלוג
                    </p>
                </div>
                <Button asChild>
                    <Link href="/">לקטלוג</Link>
                </Button>
            </div>
        );
    }

    const detailMap = new Map(details.map((d) => [d.id, d]));
    const subtotal = orderItems.reduce((sum, item) => {
        const detail = detailMap.get(item.product_id);
        return sum + (detail ? detail.price_agorot * item.quantity : 0);
    }, 0);
    const hasUnavailableItems = orderItems.some((item) => {
        const detail = detailMap.get(item.product_id);
        return !detail || !detail.is_active || detail.stock_quantity <= 0;
    });

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-8 lg:grid-cols-[1fr_340px]"
            >
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>פרטים אישיים</CardTitle>
                            <CardDescription>אנחנו נזהה אותך לפי הטלפון</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <FormField
                                control={form.control}
                                name="full_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>שם מלא</FormLabel>
                                        <FormControl>
                                            <Input placeholder="ישראל ישראלי" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>טלפון</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="050-123-4567"
                                                dir="ltr"
                                                inputMode="tel"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            איש קשר למשלוח — ללא הרשמה
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-2">
                                כתובת למשלוח
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleGeolocation}
                                    disabled={locating}
                                >
                                    {locating ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <LocateFixed className="size-4" />
                                    )}
                                    איתור מיקום
                                </Button>
                            </CardTitle>
                            <CardDescription>
                                אוטומטי מהדפדפן או מילוי ידני
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <FormField
                                control={form.control}
                                name="address.full_address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>כתובת</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="רחוב, מספר בית, כניסה, דירה"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="address.city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>עיר</FormLabel>
                                        <FormControl>
                                            <Input placeholder="תל אביב" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {form.watch("lat") != null && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin className="size-3.5" />
                                    המיקום נקלט אוטומטית מהדפדפן
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>אופן תשלום</CardTitle>
                            <CardDescription>בשלב זה אין תשלום מקוון</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="payment_method"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <RadioGroup
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                className="grid gap-3 sm:grid-cols-2"
                                            >
                                                <div className="flex items-center gap-3 rounded-lg border p-3">
                                                    <RadioGroupItem value="cash" id="payment-cash" />
                                                    <Label htmlFor="payment-cash">מזומן</Label>
                                                </div>
                                                <div className="flex items-center gap-3 rounded-lg border p-3">
                                                    <RadioGroupItem
                                                        value="card_terminal"
                                                        id="payment-card"
                                                    />
                                                    <Label htmlFor="payment-card">אשראי</Label>
                                                </div>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>הערות (אופציונלי)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="customer_notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea
                                                placeholder="הערות למשלוח, שעה נוחה, פעמון שבור..."
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="h-fit rounded-xl border p-4 lg:sticky lg:top-24">
                    <h2 className="font-semibold">סיכום הזמנה</h2>
                    <Separator className="my-3" />

                    <div className="grid gap-3">
                        {orderItems.map((item) => {
                            const detail = detailMap.get(item.product_id);
                            return (
                                <div key={item.product_id} className="flex items-center gap-3">
                                    <div className="relative aspect-square size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                                        {detail?.image_url ? (
                                            <Image
                                                src={detail.image_url}
                                                alt={detail.name_he}
                                                fill
                                                sizes="48px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                                                —
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-sm">
                                        <div className="line-clamp-1 font-medium">
                                            {detail?.name_he ?? "..."}
                                        </div>
                                        <div className="text-muted-foreground">
                                            {item.quantity} × {detail ? formatILS(detail.price_agorot) : ""}
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium">
                                        {detail ? formatILS(detail.price_agorot * item.quantity) : ""}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <Separator className="my-3" />
                    <div className="flex justify-between text-sm">
                        <span>סה"כ מוצרים</span>
                        <span>{formatILS(subtotal)}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        דמי משלוח יחושבו לפי סל ההזמנה
                    </div>

                    {hasUnavailableItems && (
                        <p className="mt-2 text-center text-xs text-destructive">
                            יש מוצרים שאזלו מן המלאי — הסירהם כדי להמשיף
                        </p>
                    )}
                    <Button type="submit" className="mt-4 w-full" size="lg" disabled={pending || hasUnavailableItems}>
                        {pending && <Loader2 className="size-4 animate-spin" />}
                        ביצוע הזמנה
                    </Button>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                        בלחיצה על ביצוע ההזמנה, ההזמנה תישלח לאישור העסק
                    </p>
                </div>
            </form>
        </Form>
    );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
    return (
        <label htmlFor={htmlFor} className="flex-1 cursor-pointer text-sm font-medium">
            {children}
        </label>
    );
}
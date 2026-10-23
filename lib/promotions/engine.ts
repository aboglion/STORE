import type {
    Promotion,
    PromotionConfig,
    PromotionSnapshot,
    PromotionType,
} from "@/types/database.types";

export interface PromotionDescription {
    description_he: string;
    description_ar: string;
}

/**
 * Shared promotion pricing engine.
 *
 * Pure module (no server-only imports) so it can run on the client for
 * live cart/checkout previews AND on the server for the authoritative
 * order total. The server always recomputes at checkout — client values
 * are never trusted.
 *
 * Supported promotion types:
 *   * multi_buy     — "buy X get Y": for every (X + Y) units of a scoped
 *                     product, Y units are granted at discount_percent
 *                     (100 = free).
 *   * price_deal    — "deal price instead of regular price": scoped
 *                     products are charged at deal_price_agorot.
 *   * free_shipping — "buy X items get free shipping": when the cart
 *                     reaches min_quantity units (or min_subtotal_agorot)
 *                     the delivery fee is waived.
 */

export interface CartPricingLine {
    product_id: string;
    quantity: number;
    unit_price_agorot: number;
    category_id: string | null;
}

export interface AppliedPromotion {
    promotion_id: string;
    name_he: string;
    name_ar: string | null;
    type: PromotionType;
    discount_agorot: number;
    description_he: string;
    description_ar: string;
}

export interface CartPricingResult {
    subtotal_agorot: number;
    discount_agorot: number;
    delivery_fee_agorot: number;
    total_agorot: number;
    free_shipping: boolean;
    applied: AppliedPromotion[];
    /** product_id → discount agorot (for per-line display). */
    line_discounts: Record<string, number>;
}

export interface DeliverySettings {
    delivery_fee_agorot: number;
    free_delivery_threshold_agorot: number;
}

/** "12.50 ₪" — locale-independent money used inside generated descriptions. */
function formatMoney(agorot: number): string {
    return `${(agorot / 100).toFixed(2).replace(/\.00$/, "")} ₪`;
}

export function isPromotionActive(p: Promotion, now: Date = new Date()): boolean {
    if (!p.is_active) return false;
    if (p.starts_at && new Date(p.starts_at) > now) return false;
    if (p.ends_at && new Date(p.ends_at) < now) return false;
    return true;
}

function inScope(p: Promotion, line: CartPricingLine): boolean {
    switch (p.scope_type) {
        case "category":
            return p.category_id != null && line.category_id === p.category_id;
        case "products":
            return p.product_ids.includes(line.product_id);
        case "all":
        default:
            return true;
    }
}

/**
 * Public description for a promotion card (storefront display).
 * Uses the promotion's regular price when available for price deals.
 */
export function describePromotion(
    promotion: Promotion,
    unitPriceAgorot?: number
): PromotionDescription {
    return buildDescription(
        promotion.type,
        promotion.config,
        unitPriceAgorot ?? 0
    );
}

function buildDescription(
    type: PromotionType,
    config: PromotionConfig,
    unitPriceAgorot: number
): { description_he: string; description_ar: string } {
    switch (type) {
        case "multi_buy": {
            const buy = config.buy_quantity ?? 0;
            const get = config.get_quantity ?? 0;
            const percent = config.discount_percent ?? 100;
            if (percent >= 100) {
                return {
                    description_he: `קנה ${buy} קבל ${get} חינם`,
                    description_ar: `اشتر ${buy} واحصل على ${get} مجانًا`,
                };
            }
            return {
                description_he: `קנה ${buy} קבל ${get} בהנחה ${percent}%`,
                description_ar: `اشتر ${buy} واحصل على ${get} بخصم ${percent}%`,
            };
        }
        case "price_deal": {
            const deal = config.deal_price_agorot ?? 0;
            return {
                description_he: `במקום ${formatMoney(unitPriceAgorot)} — ${formatMoney(deal)}`,
                description_ar: `بدلًا من ${formatMoney(unitPriceAgorot)} — ${formatMoney(deal)}`,
            };
        }
        case "free_shipping":
        default:
            return {
                description_he: "משלוח חינם",
                description_ar: "توصيل مجاني",
            };
    }
}

/**
 * Computes the full cart pricing: subtotal, promotion discounts,
 * delivery fee (threshold + free-shipping promotions) and total.
 */
export function computeCartPricing(
    lines: CartPricingLine[],
    promotions: Promotion[],
    settings: DeliverySettings
): CartPricingResult {
    const now = new Date();
    const active = promotions
        .filter((p) => isPromotionActive(p, now))
        .sort((a, b) => a.sort_order - b.sort_order);

    const subtotalAgorot = lines.reduce(
        (sum, l) => sum + l.unit_price_agorot * l.quantity,
        0
    );

    const lineDiscounts: Record<string, number> = {};
    const applied: AppliedPromotion[] = [];
    let discountAgorot = 0;

    // 1. Price deals — charge the deal price instead of the regular price.
    for (const promo of active.filter((p) => p.type === "price_deal")) {
        const dealPrice = promo.config.deal_price_agorot;
        if (!dealPrice || dealPrice <= 0) continue;

        let promoDiscount = 0;
        for (const line of lines) {
            if (!inScope(promo, line)) continue;
            const unitDiscount = Math.max(0, line.unit_price_agorot - dealPrice);
            if (unitDiscount <= 0) continue;
            const lineDiscount = unitDiscount * line.quantity;
            promoDiscount += lineDiscount;
            lineDiscounts[line.product_id] =
                (lineDiscounts[line.product_id] ?? 0) + lineDiscount;
        }

        if (promoDiscount > 0) {
            discountAgorot += promoDiscount;
            const { description_he, description_ar } = buildDescription(
                promo.type,
                promo.config,
                lines[0]?.unit_price_agorot ?? 0
            );
            applied.push({
                promotion_id: promo.id,
                name_he: promo.name_he,
                name_ar: promo.name_ar,
                type: promo.type,
                discount_agorot: promoDiscount,
                description_he,
                description_ar,
            });
        }
    }

    // 2. Multi-buy — buy X get Y (free or discounted).
    for (const promo of active.filter((p) => p.type === "multi_buy")) {
        const buy = promo.config.buy_quantity ?? 0;
        const get = promo.config.get_quantity ?? 0;
        const percent = promo.config.discount_percent ?? 100;
        if (buy <= 0 || get <= 0) continue;

        let promoDiscount = 0;
        for (const line of lines) {
            if (!inScope(promo, line)) continue;
            const groupSize = buy + get;
            const groups = Math.floor(line.quantity / groupSize);
            if (groups <= 0) continue;
            const freeUnits = groups * get;
            const unitDiscount = Math.round(
                (line.unit_price_agorot * Math.min(100, Math.max(0, percent))) / 100
            );
            const lineDiscount = freeUnits * unitDiscount;
            promoDiscount += lineDiscount;
            lineDiscounts[line.product_id] =
                (lineDiscounts[line.product_id] ?? 0) + lineDiscount;
        }

        if (promoDiscount > 0) {
            discountAgorot += promoDiscount;
            const { description_he, description_ar } = buildDescription(
                promo.type,
                promo.config,
                0
            );
            applied.push({
                promotion_id: promo.id,
                name_he: promo.name_he,
                name_ar: promo.name_ar,
                type: promo.type,
                discount_agorot: promoDiscount,
                description_he,
                description_ar,
            });
        }
    }

    // 3. Delivery fee — free above the threshold, or via a free-shipping
    //    promotion (buy X items / reach a subtotal).
    let deliveryFeeAgorot =
        subtotalAgorot >= settings.free_delivery_threshold_agorot
            ? 0
            : settings.delivery_fee_agorot;
    let freeShipping = false;

    for (const promo of active.filter((p) => p.type === "free_shipping")) {
        const scopedLines = lines.filter((l) => inScope(promo, l));
        const scopedUnits = scopedLines.reduce((s, l) => s + l.quantity, 0);
        const scopedSubtotal = scopedLines.reduce(
            (s, l) => s + l.unit_price_agorot * l.quantity,
            0
        );
        const minQuantity = promo.config.min_quantity ?? 0;
        const minSubtotal = promo.config.min_subtotal_agorot ?? 0;

        const met =
            (minQuantity > 0 && scopedUnits >= minQuantity) ||
            (minSubtotal > 0 && scopedSubtotal >= minSubtotal);

        if (met) {
            freeShipping = true;
            deliveryFeeAgorot = 0;
            applied.push({
                promotion_id: promo.id,
                name_he: promo.name_he,
                name_ar: promo.name_ar,
                type: promo.type,
                discount_agorot: 0,
                description_he: "משלוח חינם",
                description_ar: "توصيل مجاني",
            });
            break;
        }
    }

    const totalAgorot = Math.max(
        0,
        subtotalAgorot - discountAgorot + deliveryFeeAgorot
    );

    return {
        subtotal_agorot: subtotalAgorot,
        discount_agorot: discountAgorot,
        delivery_fee_agorot: deliveryFeeAgorot,
        total_agorot: totalAgorot,
        free_shipping: freeShipping,
        applied,
        line_discounts: lineDiscounts,
    };
}

/** Converts applied promotions into the frozen receipt snapshot. */
export function toPromotionSnapshot(
    applied: AppliedPromotion[]
): PromotionSnapshot[] {
    return applied.map((a) => ({
        promotion_id: a.promotion_id,
        name_he: a.name_he,
        name_ar: a.name_ar,
        type: a.type,
        discount_agorot: a.discount_agorot,
        description_he: a.description_he,
        description_ar: a.description_ar,
    }));
}
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * ColorfulCartBag:
 * An exquisitely styled shopping bag icon with gentle translucent green gradients
 * (emerald green, spring green, and jade) with refined transparency.
 */
export function ColorfulCartBag({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={cn("size-5 drop-shadow-sm", className)}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <defs>
                {/* Translucent green gradient for the bag body */}
                <linearGradient id="cart-bag-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22C55E" />   {/* Fresh Green */}
                    <stop offset="50%" stopColor="#10B981" />  {/* Emerald Green */}
                    <stop offset="100%" stopColor="#059669" /> {/* Deep Emerald */}
                </linearGradient>

                {/* Soft translucent green inner fill */}
                <linearGradient id="cart-bag-fill-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34D399" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.10" />
                </linearGradient>

                {/* Refined green handle gradient */}
                <linearGradient id="cart-handle-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="50%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#059669" />
                </linearGradient>
            </defs>

            {/* Bag Body */}
            <path
                d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"
                stroke="url(#cart-bag-body-grad)"
                strokeWidth="2.2"
                strokeLinejoin="round"
                fill="url(#cart-bag-fill-grad)"
            />

            {/* Top Rim */}
            <path
                d="M3 6h18"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeOpacity="0.85"
            />

            {/* Handle in emerald jade */}
            <path
                d="M16 10a4 4 0 0 1-8 0"
                stroke="url(#cart-handle-grad)"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/**
 * BanknoteSvg:
 * A crisp vector illustration of a banknote with shekel symbol, guilloche border,
 * corner denominations, and holographic foil strip. Used as primary / fallback.
 */
export function BanknoteSvg({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 64 32"
            className={cn("w-auto h-3.5 object-contain drop-shadow-xs", className)}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="שטר כסף"
        >
            <defs>
                <linearGradient id="banknote-foil" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="50%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
                <linearGradient id="banknote-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#DCFCE7" />
                    <stop offset="100%" stopColor="#BBF7D0" />
                </linearGradient>
            </defs>

            {/* Banknote paper base */}
            <rect x="0.5" y="0.5" width="63" height="31" rx="2.5" fill="url(#banknote-bg)" stroke="#16A34A" strokeWidth="1" />

            {/* Ornate border frame */}
            <rect x="2.5" y="2.5" width="59" height="27" rx="1.5" stroke="#15803D" strokeWidth="0.7" strokeDasharray="2.5 1" fill="none" opacity="0.8" />

            {/* Holographic security stripe */}
            <rect x="14" y="2.5" width="4.5" height="27" fill="url(#banknote-foil)" opacity="0.9" />

            {/* Center denomination badge */}
            <circle cx="36" cy="16" r="7.5" fill="#86EFAC" stroke="#15803D" strokeWidth="0.8" />
            <text x="36" y="19.5" fontSize="10" fontWeight="900" fill="#14532D" textAnchor="middle" fontFamily="sans-serif">₪</text>

            {/* Corner numbers */}
            <text x="5" y="9.5" fontSize="6" fontWeight="bold" fill="#166534" fontFamily="sans-serif">100</text>
            <text x="59" y="27.5" fontSize="6" fontWeight="bold" fill="#166534" textAnchor="end" fontFamily="sans-serif">100</text>
        </svg>
    );
}

/**
 * BanknoteImage:
 * Renders the photo-realistic banknote PNG image (/images/banknote.png),
 * seamlessly falling back to BanknoteSvg on load error.
 */
export function BanknoteImage({ className }: { className?: string }) {
    const [useFallback, setUseFallback] = useState(false);

    if (useFallback) {
        return <BanknoteSvg className={className} />;
    }

    return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
            src="/images/banknote.png"
            alt="שטר כסף"
            onError={() => setUseFallback(true)}
            className={cn(
                "h-3.5 w-auto max-w-[34px] rounded-[2px] shadow-xs border border-emerald-500/40 object-contain",
                className
            )}
        />
    );

}

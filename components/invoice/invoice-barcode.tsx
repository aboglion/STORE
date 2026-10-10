"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface InvoiceBarcodeProps {
    value: string;
    height?: number;
}

/**
 * Code128 barcode of the order number, rendered into an SVG.
 * The barcode is what the courier scans/scans-to at handoff.
 */
export function InvoiceBarcode({ value, height = 56 }: InvoiceBarcodeProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current || !value) return;
        try {
            JsBarcode(svgRef.current, value, {
                format: "CODE128",
                width: 1.6,
                height,
                displayValue: true,
                margin: 4,
                background: "#ffffff",
                lineColor: "#111827",
                fontSize: 13,
                fontOptions: "bold",
            });
        } catch {
            // Barcode rendering is best-effort; the invoice stays readable.
        }
    }, [value, height]);

    return (
        <svg
            ref={svgRef}
            role="img"
            aria-label={`barcode ${value}`}
            className="h-auto w-full max-w-xs"
        />
    );
}
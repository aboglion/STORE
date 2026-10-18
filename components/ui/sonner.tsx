"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            className="toaster group"
            position="top-center"
            offset={{ top: 76, bottom: 24 }}
            duration={2200}
            toastOptions={{
                classNames: {
                    toast: "group toast group-[.toaster]:bg-card/85 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-border/60 group-[.toaster]:shadow-lg group-[.toaster]:rounded-full group-[.toaster]:py-2 group-[.toaster]:px-4 group-[.toaster]:text-xs sm:group-[.toaster]:text-sm group-[.toaster]:font-medium",
                    description: "group-[.toast]:text-muted-foreground",
                    actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                    success: "group-[.toaster]:border-primary/30 group-[.toaster]:text-foreground",
                    error: "group-[.toaster]:border-destructive/30 group-[.toaster]:text-destructive",
                },
            }}
            style={
                {
                    "--normal-bg": "var(--popover)",
                    "--normal-text": "var(--popover-foreground)",
                    "--normal-border": "var(--border)",
                } as React.CSSProperties
            }
            {...props}
        />
    );
};

export { Toaster };
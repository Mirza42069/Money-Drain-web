"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    side?: "top" | "bottom" | "left" | "right";
}

function Tooltip({ children, content, side = "bottom" }: TooltipProps) {
    const [isVisible, setIsVisible] = React.useState(false);

    const positionClasses = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
    };

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    className={cn(
                        "absolute z-[9999] px-2 py-1 text-[11px] font-medium rounded-md pointer-events-none",
                        "bg-zinc-900 text-zinc-100 shadow-xl border border-zinc-700",
                        "whitespace-nowrap animate-in fade-in-0 zoom-in-95 duration-100",
                        positionClasses[side]
                    )}
                >
                    {content}
                </div>
            )}
        </div>
    );
}

export { Tooltip };

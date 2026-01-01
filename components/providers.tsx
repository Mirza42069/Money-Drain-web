"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider
            appearance={{
                variables: {
                    colorPrimary: "#10b981",
                    colorBackground: "#0a0a0a",
                    colorInputBackground: "#171717",
                    colorText: "#f5f5f5",
                    colorTextSecondary: "#a3a3a3",
                    colorInputText: "#f5f5f5",
                    colorNeutral: "#f5f5f5",
                },
                elements: {
                    userButtonPopoverCard: "bg-[#171717] border-[#262626]",
                    userButtonPopoverActionButton: "text-[#f5f5f5] hover:bg-[#262626]",
                    userButtonPopoverActionButtonText: "text-[#f5f5f5]",
                    userButtonPopoverActionButtonIcon: "text-[#a3a3a3]",
                    userButtonPopoverFooter: "hidden",
                    userPreviewMainIdentifier: "text-[#f5f5f5]",
                    userPreviewSecondaryIdentifier: "text-[#a3a3a3]",
                }
            }}
        >
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                {children}
            </ConvexProviderWithClerk>
        </ClerkProvider>
    );
}


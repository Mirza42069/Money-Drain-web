"use client";

import { useRouter } from "next/navigation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconLock, IconSparkles } from "@tabler/icons-react";

interface SubscriptionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filterName: string;
}

export function SubscriptionDialog({ open, onOpenChange, filterName }: SubscriptionDialogProps) {
    const router = useRouter();

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="size-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                            <IconSparkles className="size-5 text-white" />
                        </div>
                        <AlertDialogTitle>Premium Feature</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="space-y-2 pt-2">
                        <span className="block">
                            The <strong>{filterName}</strong> filter is a premium feature.
                        </span>
                        <span className="block text-sm">
                            Upgrade to Premium to unlock advanced time filters and get the most out of Money Drain.
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Maybe Later</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => router.push("/pricing")}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    >
                        <IconLock className="size-4 mr-1" />
                        Upgrade Now
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

import { PricingTable } from '@clerk/nextjs'

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <h1 className="text-2xl font-bold text-center mb-6">Upgrade to Premium</h1>
                <p className="text-center text-muted-foreground mb-8">
                    Unlock advanced filters and get the full Money Drain experience
                </p>
                <PricingTable />
            </div>
        </div>
    )
}

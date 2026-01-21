import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Migration mutation to import transactions from CSV data
export const importTransactions = mutation({
    args: {
        userId: v.string(),
        account: v.number(),
        transactions: v.array(
            v.object({
                description: v.string(),
                amount: v.number(),
                type: v.union(v.literal("income"), v.literal("expense")),
                category: v.string(),
                date: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        // Verify the userId matches the authenticated user
        if (identity.subject !== args.userId) {
            throw new Error("User ID mismatch");
        }

        let imported = 0;
        for (const tx of args.transactions) {
            await ctx.db.insert("transactions", {
                userId: args.userId,
                account: args.account,
                description: tx.description,
                amount: tx.amount,
                type: tx.type,
                category: tx.category,
                date: tx.date,
            });
            imported++;
        }

        return { imported };
    },
});

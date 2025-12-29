import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
    args: { account: v.number() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user_account", (q) =>
                q.eq("userId", identity.subject).eq("account", args.account)
            )
            .collect();

        return transactions.map((t) => ({
            id: t._id,
            description: t.description,
            amount: t.amount,
            type: t.type,
            category: t.category,
            date: t.date,
        }));
    },
});

export const create = mutation({
    args: {
        account: v.number(),
        description: v.string(),
        amount: v.number(),
        type: v.union(v.literal("income"), v.literal("expense")),
        category: v.string(),
        date: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        // Input validation
        if (args.account < 1 || args.account > 10) {
            throw new Error("Invalid account number");
        }
        if (args.amount <= 0 || args.amount > 999999999) {
            throw new Error("Invalid amount");
        }
        if (args.description.length > 200) {
            throw new Error("Description too long");
        }
        if (args.category.length > 100) {
            throw new Error("Category too long");
        }

        const id = await ctx.db.insert("transactions", {
            userId: identity.subject,
            account: args.account,
            description: args.description.trim(),
            amount: args.amount,
            type: args.type,
            category: args.category,
            date: args.date,
        });

        return id;
    },
});

export const update = mutation({
    args: {
        id: v.id("transactions"),
        description: v.optional(v.string()),
        amount: v.optional(v.number()),
        type: v.optional(v.union(v.literal("income"), v.literal("expense"))),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const existing = await ctx.db.get(args.id);
        if (!existing || existing.userId !== identity.subject) {
            throw new Error("Transaction not found");
        }

        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    },
});

export const remove = mutation({
    args: { id: v.id("transactions") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const existing = await ctx.db.get(args.id);
        if (!existing || existing.userId !== identity.subject) {
            throw new Error("Transaction not found");
        }

        await ctx.db.delete(args.id);
    },
});

export const clear = mutation({
    args: { account: v.number() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user_account", (q) =>
                q.eq("userId", identity.subject).eq("account", args.account)
            )
            .collect();

        for (const t of transactions) {
            await ctx.db.delete(t._id);
        }
    },
});

export const convertAll = mutation({
    args: {
        account: v.number(),
        fromRate: v.number(),
        toRate: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user_account", (q) =>
                q.eq("userId", identity.subject).eq("account", args.account)
            )
            .collect();

        for (const t of transactions) {
            const amountInUSD = t.amount / args.fromRate;
            const convertedAmount = amountInUSD * args.toRate;
            const roundedAmount =
                args.toRate >= 100
                    ? Math.round(convertedAmount)
                    : Math.round(convertedAmount * 100) / 100;

            await ctx.db.patch(t._id, { amount: roundedAmount });
        }
    },
});

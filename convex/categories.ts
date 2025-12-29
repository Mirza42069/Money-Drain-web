import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        const categories = await ctx.db
            .query("customCategories")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject))
            .collect();

        return categories.map((c) => ({
            id: c._id,
            type: c.type,
            name: c.name,
            icon: c.icon,
            color: c.color,
        }));
    },
});

export const create = mutation({
    args: {
        type: v.union(v.literal("income"), v.literal("expense")),
        name: v.string(),
        icon: v.string(),
        color: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        // Input validation
        if (args.name.length > 50) {
            throw new Error("Category name too long");
        }
        if (args.icon.length > 10) {
            throw new Error("Icon too long");
        }
        if (args.color.length > 50) {
            throw new Error("Color too long");
        }

        const id = await ctx.db.insert("customCategories", {
            userId: identity.subject,
            type: args.type,
            name: args.name.trim(),
            icon: args.icon,
            color: args.color,
        });

        return { id, ...args };
    },
});

export const remove = mutation({
    args: { id: v.id("customCategories") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const existing = await ctx.db.get(args.id);
        if (!existing || existing.userId !== identity.subject) {
            throw new Error("Category not found");
        }

        await ctx.db.delete(args.id);
    },
});

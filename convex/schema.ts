import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    transactions: defineTable({
        userId: v.string(),
        account: v.number(),
        description: v.string(),
        amount: v.number(),
        type: v.union(v.literal("income"), v.literal("expense")),
        category: v.string(),
        date: v.string(),
        tags: v.optional(v.array(v.string())),
    })
        .index("by_user", ["userId"])
        .index("by_user_account", ["userId", "account"]),

    customCategories: defineTable({
        userId: v.string(),
        type: v.union(v.literal("income"), v.literal("expense")),
        name: v.string(),
        icon: v.string(),
        color: v.string(),
    }).index("by_user", ["userId"]),
});

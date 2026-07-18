// OWNER: W3 (subject photo). Convex file storage for the missing person's
// portrait: upload once, it shows in every connected searcher's header.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Step 1 of the standard Convex upload: hand the browser a short-lived,
// authenticated URL to POST the file bytes to.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Step 3: the browser POSTs to the upload URL, gets back a storageId, and
// calls this to bind the stored file to the case. Reactivity fans it out.
export const attach = mutation({
  args: { caseId: v.id("cases"), storageId: v.id("_storage") },
  handler: async (ctx, { caseId, storageId }) => {
    await ctx.db.patch(caseId, { photoStorageId: storageId });
  },
});

// Stage pre-flight helper: resetDemo wipes table rows but NOT _storage, so
// the uploaded portrait survives resets. This re-binds the newest stored
// file to the active case in one no-arguments command:
//   npx convex run photos:attachLatest
export const attachLatest = mutation({
  args: {},
  handler: async (ctx) => {
    const kase = await ctx.db
      .query("cases")
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    if (!kase) return "no active case";
    const latest = await ctx.db.system
      .query("_storage")
      .order("desc")
      .first();
    if (!latest) return "no stored files";
    await ctx.db.patch(kase._id, { photoStorageId: latest._id });
    return `attached ${latest._id}`;
  },
});

// Signed URL for the current case photo, or null if none attached yet.
// getUrl() also returns null if the stored file is gone.
export const url = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    const kase = await ctx.db.get(caseId);
    if (!kase?.photoStorageId) return null;
    return await ctx.storage.getUrl(kase.photoStorageId);
  },
});

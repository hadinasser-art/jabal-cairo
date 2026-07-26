#!/usr/bin/env node
/**
 * Re-stamps existing Storage objects with a long Cache-Control TTL.
 *
 * Files uploaded before this change carry `max-age=3600`, so the CDN drops them
 * every hour and every returning visitor re-downloads the full gallery. That is
 * the recurring cached-egress cost. This walks the bucket and re-uploads each
 * stale object's *existing bytes* to its *existing path*, changing only the TTL.
 *
 * Because the path is unchanged, public URLs stay valid and no database row is
 * touched. Nothing is deleted, and nothing is recompressed.
 *
 * Dry run (default — reads only, writes nothing):
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-image-cache.mjs
 *
 * Apply:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-image-cache.mjs --apply
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "products";
const TARGET_CACHE_CONTROL = "31536000";
const TARGET_MAX_AGE = `max-age=${TARGET_CACHE_CONTROL}`;
const PAGE_SIZE = 100;
const CONCURRENCY = 4;

const apply = process.argv.includes("--apply");

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing config. Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Find the service role key under Project Settings > API. Keep it out of git and\n" +
      "out of any VITE_ prefixed variable, which would ship it to the browser.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Storage list() is per-prefix, so walk folders depth-first. */
async function listAll(prefix = "") {
  const found = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE_SIZE, offset });
    if (error) throw new Error(`list(${prefix || "/"}) failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders come back as synthetic rows with no id and no metadata.
      if (entry.id === null) found.push(...(await listAll(path)));
      else found.push({ path, metadata: entry.metadata ?? {} });
    }

    if (data.length < PAGE_SIZE) break;
  }
  return found;
}

async function restamp(file) {
  const download = await supabase.storage.from(BUCKET).download(file.path);
  if (download.error) throw new Error(download.error.message);

  const contentType = file.metadata.mimetype || download.data.type || "application/octet-stream";
  const update = await supabase.storage.from(BUCKET).update(file.path, download.data, {
    cacheControl: TARGET_CACHE_CONTROL,
    contentType,
    upsert: true,
  });
  if (update.error) throw new Error(update.error.message);
}

const formatMb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

async function main() {
  console.log(`Bucket "${BUCKET}" on ${new URL(url).host}`);
  console.log(apply ? "Mode: APPLY — objects will be rewritten\n" : "Mode: dry run\n");

  const files = await listAll();
  const stale = files.filter((file) => file.metadata.cacheControl !== TARGET_MAX_AGE);
  const totalBytes = files.reduce((sum, file) => sum + (file.metadata.size ?? 0), 0);
  const staleBytes = stale.reduce((sum, file) => sum + (file.metadata.size ?? 0), 0);

  console.log(`${files.length} objects, ${formatMb(totalBytes)} total`);
  console.log(`${stale.length} still on a short TTL, ${formatMb(staleBytes)}\n`);

  const oversized = files
    .filter((file) => (file.metadata.size ?? 0) > 1_000_000)
    .sort((a, b) => (b.metadata.size ?? 0) - (a.metadata.size ?? 0));
  if (oversized.length) {
    console.log(`${oversized.length} objects are over 1 MB. Largest:`);
    for (const file of oversized.slice(0, 10)) {
      console.log(`  ${formatMb(file.metadata.size ?? 0).padStart(9)}  ${file.path}`);
    }
    console.log("  (this script does not recompress — it only changes the TTL)\n");
  }

  if (stale.length === 0) {
    console.log("Every object already has the long TTL. Nothing to do.");
    return;
  }

  if (!apply) {
    console.log(`Dry run complete. Re-run with --apply to re-stamp ${stale.length} objects.`);
    console.log(
      `Note: applying downloads and re-uploads ${formatMb(staleBytes)} once, which itself\n` +
        "costs egress. It is a one-off against an hourly recurring cost.",
    );
    return;
  }

  let done = 0;
  const failures = [];
  for (let index = 0; index < stale.length; index += CONCURRENCY) {
    const batch = stale.slice(index, index + CONCURRENCY);
    await Promise.all(
      batch.map(async (file) => {
        try {
          await restamp(file);
        } catch (error) {
          failures.push({ path: file.path, message: error.message });
        } finally {
          done += 1;
          process.stdout.write(`\r  ${done}/${stale.length} processed`);
        }
      }),
    );
  }
  process.stdout.write("\n\n");

  console.log(`Re-stamped ${stale.length - failures.length} objects.`);
  if (failures.length) {
    console.log(`${failures.length} failed (originals untouched):`);
    for (const failure of failures) console.log(`  ${failure.path}: ${failure.message}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`\nFailed: ${error.message}`);
  process.exit(1);
});

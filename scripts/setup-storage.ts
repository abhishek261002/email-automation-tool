/**
 * setup-storage.ts
 *
 * One-time setup script to create the Supabase Storage bucket for resumes.
 * Run this after deploying your Supabase project:
 *
 *   npx ts-node scripts/setup-storage.ts
 *
 * Requirement: Storage bucket named `resumes` with public read access.
 * Requirement 4.3, 11.3
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupStorage() {
  console.log("Setting up Supabase Storage bucket: resumes...");

  // Check if bucket already exists
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    console.error("Failed to list buckets:", listError.message);
    process.exit(1);
  }

  const resumesBucket = buckets?.find((b) => b.name === "resumes");

  if (resumesBucket) {
    console.log("Bucket 'resumes' already exists. Skipping creation.");
    return;
  }

  // Create the resumes bucket with public read access
  const { data, error } = await supabase.storage.createBucket("resumes", {
    public: true, // Public CDN read access for PDF attachments
    allowedMimeTypes: ["application/pdf"],
    fileSizeLimit: 10 * 1024 * 1024, // 10MB max
  });

  if (error) {
    console.error("Failed to create bucket:", error.message);
    process.exit(1);
  }

  console.log("✓ Bucket 'resumes' created successfully:", data);
}

setupStorage();

-- ============================================================
-- Migration 005: Storage Bucket Policies — Driftmark
-- Mitigates: AS-03 (photo security), AS-01 (unauthorized access)
-- ============================================================
-- Storage is the second authorization layer for photos.
-- RLS on place_photos (migration 004) guards DB metadata.
-- These policies guard the actual file bytes in Supabase Storage.
--
-- Bucket design:
--   place-photos  — private, user-scoped paths only ({user_id}/*)
--   avatars       — public read (profile pictures), own write
--   share-cards   — public read (generated share images), own write
--
-- Path convention enforced by policy:
--   (storage.foldername(name))[1] = auth.uid()::text
-- This means the FIRST path segment must equal the authenticated
-- user's UUID, e.g.: a3f8.../photo.jpg
-- A user cannot write to or read from another user's folder.
-- ============================================================

-- ------------------------------------------------------------
-- Create buckets
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- place-photos: private (public=false); 5 MB limit; JPEG/PNG/WebP only
  -- Mitigates AS-03 T-03-A: restricts file types to known safe images
  -- Mitigates AS-03 T-03-C: 5 MB hard limit per file
  ('place-photos', 'place-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),

  -- avatars: public (profile pictures must be accessible to group members)
  -- 2 MB limit; JPEG/PNG/WebP only
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),

  -- share-cards: public (pre-generated share card images); 1 MB limit
  ('share-cards', 'share-cards', true, 1048576, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- place-photos bucket policies
-- Private bucket: users can only access files under their own folder.
-- Mitigates AS-03 T-03-B (M-03-B): path-scoped access prevents
-- cross-user photo access even if a direct URL is guessed.
-- Mitigates AS-01 T-01-B (M-01-B): requires authenticated session.
-- ------------------------------------------------------------

-- Users can upload files only to their own folder
CREATE POLICY "place_photos_upload_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'place-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read files only from their own folder
-- Original full-res files should be served via short-lived signed URLs
-- generated server-side; this policy is the last-resort guard.
-- Mitigates AS-03 M-03-F: signed URL pattern enforced at application layer
CREATE POLICY "place_photos_select_own" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'place-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete only their own files
CREATE POLICY "place_photos_delete_own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'place-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update (replace) only their own files
CREATE POLICY "place_photos_update_own" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'place-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- avatars bucket policies
-- Public read (any visitor can view profile pictures).
-- Write is scoped to own folder.
-- ------------------------------------------------------------

-- Any authenticated user can upload their own avatar
CREATE POLICY "avatars_upload_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read — avatars must be visible to group members and profile pages
CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Users can only delete their own avatar
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can only replace (update) their own avatar
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- share-cards bucket policies
-- Public read (share card links are meant to be shared externally).
-- Write is scoped to own folder so users can only generate their own cards.
-- ------------------------------------------------------------

-- Any authenticated user can upload their own share card
CREATE POLICY "share_cards_upload_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'share-cards'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read — share card links must be accessible without auth
-- Mitigates AS-10 T-10-A: share cards contain no private data by design
CREATE POLICY "share_cards_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'share-cards');

-- Users can only delete their own share cards
CREATE POLICY "share_cards_delete_own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'share-cards'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

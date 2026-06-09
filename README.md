# Digital Wardrobe

Mobile-first static web app for a digital wardrobe. It uses Supabase for the `clothes` table and `clothes-images` Storage bucket.

## Vercel Deploy

Set the Vercel project Root Directory to:

```text
digital-wardrobe
```

Use these settings:

```text
Framework Preset: Other
Build Command: npm run build
Output Directory: .
Install Command: npm install
```

Before using the app, run `supabase-setup.sql` once in the Supabase SQL Editor.

## Local Check

```bash
npm run check
```

# Karma Event - Cloudflare Pages + D1 (No R2)

This version is designed for Cloudflare Pages Git deployments.

## Cloudflare Pages build settings
- Framework preset: None
- Build command: `npm run build`
- Build output directory: `.`
- Root directory: `/`

## D1 Binding
Pages -> Settings -> Functions -> D1 database bindings
- Variable name: `DB`
- Select your existing Karma Event D1 database

No R2 binding is required.

## D1 schema
Run `schema.sql` once in the D1 Console.

## Admin
https://karmaevent.in/admin.html

Default password: `Karma@2026`

The backend is `functions/api.js` and uses the Pages Functions runtime. Do not add PHP.

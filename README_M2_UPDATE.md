# Trip Planner M2 - incremental update

**Install over your existing working M1 project**, not in a new project.

1. Upload this ZIP to the Codespaces directory containing `package.json`.
2. `unzip -q -o trip-planner-m2-update.zip`
3. `cp -R trip-planner-m2-update/. .`
4. `npm run check`
5. Run the M2 SQL migration **once** in Supabase SQL Editor.
6. Open a trip in the port 3000 website preview and add your first stop.

Full instructions: `docs/M2_SETUP.md`.

This overlay intentionally excludes `next.config.mjs`, `.env.local`, M1 auth files, and all dependency manifests to retain your working setup and login fixes.

# Smart Quran App (Local Mode)

The app now runs fully in local mode:
- No database
- No Supabase setup
- No cloud account required
- Data saved on the same device (localStorage)

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Notes
- Your progress is stored locally on your device/browser.
- If you clear browser storage, local data will be removed.
- `netlify.toml` is included for SPA route handling on Netlify.

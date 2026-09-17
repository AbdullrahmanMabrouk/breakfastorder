# Lunch Board

A tiny shared web app for a team to answer two questions every day:

1. Am I ordering food?
2. What am I eating?

The board is shared in real time through Supabase.

## Setup

### 1. Create the database

Create a free Supabase project, open **SQL Editor**, paste the contents of `supabase.sql`, and run it.

### 2. Get your project credentials

In Supabase, open **Project Settings → API** and copy:

- Project URL
- Publishable/anon key

### 3. Put the credentials in the app

Open `app.js` and replace:

```js
const SUPABASE_URL = 'PASTE_YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE';
```

with your real values.

### 4. Deploy

The folder is plain HTML/CSS/JS, so it can be hosted by GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any normal static web host.

For GitHub Pages:

1. Create a GitHub repository.
2. Upload all files from this folder.
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**, select `main`, and save.
5. Open the generated site URL on your PC and share it with coworkers.

## Daily use

The first person opens **Manage team** and adds everyone's names. Each coworker selects their name, turns **I'm ordering food** on or off, adds the meal, and saves.

The dashboard immediately shows everyone together:

- Ordering
- Not ordering
- Waiting
- Total people

The **Copy order** button copies a clean list you can paste into WhatsApp or wherever you place the actual food order.

## Important note about privacy

The included SQL intentionally lets anyone using the app read and edit the shared board. That's convenient for a trusted office/team board, but it is not suitable for sensitive data. For a private/authenticated version, add Supabase Auth and tighter row-level security policies.

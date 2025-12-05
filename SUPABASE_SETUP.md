# Supabase Setup for Community Features

To enable sharing moodboards with others, you need to connect the app to a Supabase database.

## 1. Create a Supabase Project
1. Go to [database.new](https://database.new) and sign in.
2. Create a new project (e.g., "Organic Moodboard").
3. Set a database password (remember it, but we won't need it for the frontend).

## 2. Run Database Migration
1. In your Supabase dashboard, go to the **SQL Editor**.
2. create a **New Query**.
3. Paste and run the following SQL:

```sql
create table moodboards (
  id text primary key,
  title text,
  author text,
  thumbnail text,
  data jsonb,
  updated_at timestamptz default now()
);

-- Turn off Row Level Security (RLS) for public access for now
alter table moodboards disable row level security;
```

## 3. Get API Keys
1. Go to **Project Settings** (gear icon) -> **API**.
2. Copy the `URL` and the `anon` `public` key.

## 4. Configure Environment
1. Open `.env` in your project root.
2. Add the following lines:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

3. Restart the server (`npm run dev`) if it doesn't pick up the changes automatically.

Once done, "Save to Community" will save to the cloud, and everyone with the app (connected to the same DB) will see the boards!

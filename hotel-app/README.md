# HotelOps — Setup Instructions

A real-time hotel room management system for admin + multi-employee use.

---

## What You Get

- **Admin dashboard** — full control: all rooms, staff assignment, analytics, activity log
- **Employee dashboard** — staff see only their assigned rooms, update status, log effort, file maintenance tickets
- **Real-time sync** — when any device updates a room, every other device sees it instantly
- **Role-based access** — admins see everything; staff see their queue

---

## Step 1 — Create a Supabase Project (FREE)

1. Go to **https://supabase.com** and sign up (free)
2. Click **"New Project"**
3. Name it something like `hotelops`
4. Choose a region close to your hotel
5. Set a database password (save it somewhere)
6. Wait ~2 minutes for it to spin up

---

## Step 2 — Run the Database Setup

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Open the file `supabase-setup.sql` from this folder
4. Copy the entire contents and paste it into the SQL editor
5. Click **Run**
6. You should see "Success" — this creates all your tables, security rules, and sample rooms

---

## Step 3 — Get Your API Keys

1. In Supabase, go to **Settings → API** (left sidebar)
2. You need two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public key** — a long string starting with `eyJ...`
3. In the hotel-app folder, create a file called `.env` (copy from `.env.example`)
4. Fill it in:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJyour-anon-key-here
```

---

## Step 4 — Create Your First Users

### Create the Admin Account
1. In Supabase → **Authentication → Users**
2. Click **"Add user"** → **"Create new user"**
3. Email: `admin@yourhotel.com`
4. Password: choose something strong
5. Click **Create User**
6. Now go to **Table Editor → profiles** table
7. Find the row for your admin email
8. Edit it: set `role` to `admin`, set `full_name` to your name
9. Save

### Create Employee Accounts
Repeat the above for each employee, but:
- Set their `role` to `housekeeper` (or `inspector`, `maintenance`, `supervisor`)
- Set their `floors` column to an array like `{1,2,3}` (PostgreSQL array format)
- Set `full_name` and `avatar_initial` (first letter of their name)

---

## Step 5 — Run the App Locally

Make sure you have **Node.js** installed (https://nodejs.org — get the LTS version).

Open a terminal in the `hotel-app` folder and run:

```bash
npm install
npm run dev
```

The app will open at **http://localhost:5173**

Log in with your admin credentials. You'll see the full dashboard.

---

## Step 6 — Deploy So Everyone Can Access It (FREE)

Use **Vercel** — it's free and takes 5 minutes:

1. Go to **https://vercel.com** and sign up with GitHub
2. Push the `hotel-app` folder to a GitHub repository
3. In Vercel, click **"Add New Project"** → import your GitHub repo
4. In the **Environment Variables** section, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**
6. Vercel gives you a URL like `https://hotelops-yourname.vercel.app`
7. Share that URL with your employees — they log in from any phone or computer

---

## Customize Your Room Layout

After deploying, the room layout is controlled in the database.

To change rooms:
1. Go to Supabase → **Table Editor → rooms**
2. Delete all rows (or just the ones you want to change)
3. Add your real room numbers and floors

Or edit the seed section at the bottom of `supabase-setup.sql` before running it.

---

## How Employees Log In

- They go to your Vercel URL on their phone or computer
- Enter their email and password (you set these in Supabase Authentication)
- They see only their assigned rooms
- They can update status, log effort, file maintenance tickets

---

## Quick Reference: Room Status Flow

```
Occupied → Checked Out → Cleaning → Inspection → Ready
                                                    ↑
                        Maintenance ────────────────┘
                        Do Not Disturb → Checked Out
```

---

## Troubleshooting

**"Invalid API key"** — Check your `.env` file has the right values with no extra spaces

**Rooms not updating in real-time** — Make sure you ran the `ALTER PUBLICATION supabase_realtime` lines in the SQL setup

**Employee can't see their rooms** — Make sure their profile row in the `profiles` table has the correct UUID in `assigned_to` on the rooms table

**Login not working** — Confirm the user exists in Supabase → Authentication → Users and their email is confirmed

---

## Tech Stack

| Layer | Tool | Cost |
|-------|------|------|
| Frontend | React + Vite | Free |
| Backend/DB | Supabase (Postgres) | Free up to 500MB |
| Auth | Supabase Auth | Free up to 50,000 users |
| Real-time | Supabase Realtime (WebSockets) | Free |
| Hosting | Vercel | Free |
| **Total** | | **$0/month** |

Supabase free tier supports up to **500MB database** and **2GB bandwidth/month** — more than enough for any hotel.

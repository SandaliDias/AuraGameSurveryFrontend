# Sensecheck Frontend

React frontend for the Sensecheck game.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Update `VITE_API_URL` with your backend URL

4. Run development server:
   ```bash
   npm run dev
   ```

## Deploy to Vercel

1. Push this folder to a new GitHub repo
2. Go to [vercel.com](https://vercel.com)
3. Import the repo
4. Add environment variable:
   - `VITE_API_URL` = `https://your-backend-url.vercel.app/api`
5. Deploy!

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (required) |
| `VITE_AURA_API_URL` | AURA integration URL (optional) |


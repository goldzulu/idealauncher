# IdeaLauncher MVP

Transform raw ideas into validated, prioritized specifications in ≤ 30 minutes.

## Project Setup

This is a Next.js 15 application with TypeScript, Tailwind CSS, and the following core dependencies:

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with email/password and magic links (via Resend)
- **AI**: Vercel AI SDK with Azure OpenAI
- **UI**: shadcn/ui components with Tailwind CSS
- **Editor**: TipTap for rich-text editing

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.local` and update the following keys:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NEXTAUTH_SECRET`: Random secret for NextAuth
   - `RESEND_API_KEY`: Resend API key for email verification
   - `EMAIL_FROM`: Email address for sending verification emails
   - `AZURE_API_KEY` & `AZURE_ENDPOINT`: Azure OpenAI credentials
   - `DOMAINR_API_KEY`: Domainr API for domain checking

3. **Set up the database**:
   ```bash
   npx prisma db push
   ```

4. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── chat/             # Chat interface components
│   ├── editor/           # Document editor components
│   └── panels/           # Research, Score, MVP panels
├── lib/                  # Utilities and configurations
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Prisma client
│   ├── ai.ts             # AI SDK configuration
│   └── utils.ts          # Helper functions
└── types/                # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Next Steps

The project foundation is now complete. You can proceed with implementing the remaining tasks from the specification:

1. Database Schema and Configuration
2. Authentication System Implementation
3. Core UI Components and Layout
4. Dashboard and Idea Management
5. And more...

Each task builds incrementally on this foundation.
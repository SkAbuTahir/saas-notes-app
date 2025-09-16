# SaaS Notes App - Multi-Tenant Notes Application

A production-ready multi-tenant SaaS Notes Application built with Next.js, Prisma, and PostgreSQL, deployed on Vercel.

## Architecture Overview

### Multi-Tenancy Approach: Shared Schema with Tenant Isolation

This application implements multi-tenancy using a **shared schema** approach with strict tenant isolation through `tenantId` columns. This design choice was made for the following reasons:

**Benefits of Shared Schema:**
- **Cost Efficiency**: Single database instance reduces infrastructure costs significantly compared to separate databases per tenant
- **Operational Simplicity**: One schema to maintain, backup, and monitor instead of hundreds or thousands
- **Resource Utilization**: Optimal use of database connections and memory across all tenants
- **Development Speed**: Faster development cycles with unified schema changes and migrations
- **Analytics**: Easier cross-tenant analytics and reporting for business intelligence

**Security Implementation:**
- Every tenant-scoped table includes a `tenantId` foreign key constraint
- All database queries are automatically scoped by `tenantId` at the application level
- Row-level security through Prisma ORM ensures no cross-tenant data leakage
- JWT tokens contain tenant information to enforce isolation at the API layer

**Trade-offs Considered:**
- Slightly more complex application logic to ensure tenant scoping vs. database-level isolation
- Requires careful testing to prevent tenant data leakage vs. natural isolation of separate schemas
- All tenants share the same database performance characteristics vs. isolated performance per tenant

The shared schema approach is ideal for this SaaS application as it balances security, performance, and cost-effectiveness while maintaining strict tenant isolation through application-level controls.

## Tech Stack

- **Frontend & Backend**: Next.js 14 (App Router) with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (HS256) with bcrypt password hashing
- **Deployment**: Vercel (serverless functions)
- **Styling**: Tailwind CSS

## Features

- ✅ Multi-tenant architecture with strict data isolation
- ✅ JWT-based authentication with role-based authorization
- ✅ Subscription-based feature gating (Free/Pro plans)
- ✅ Atomic quota enforcement using database transactions
- ✅ CRUD operations for notes
- ✅ Admin functions (user invitation, tenant upgrades)
- ✅ Responsive web interface
- ✅ Comprehensive test suite

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/saas_notes"

# JWT Secret - Generate a secure random string
JWT_SECRET="your-super-secret-jwt-key-here"

# API Base URL for frontend
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"

# Environment
NODE_ENV="development"
```

For Vercel deployment, set these environment variables in the Vercel dashboard:
- `DATABASE_URL`: Your PostgreSQL connection string
- `JWT_SECRET`: A secure random string for JWT signing
- `NEXT_PUBLIC_API_BASE_URL`: Your Vercel app URL (e.g., https://your-app.vercel.app)

## Local Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd saas-notes-app
   npm install
   ```

2. **Database Setup**
   ```bash
   # Run migrations
   npx prisma migrate dev
   
   # Seed the database
   npm run db:seed
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - API Health: http://localhost:3000/api/health

## Deployment to Vercel

### Option 1: Automated Deployment

1. **Connect GitHub to Vercel**
   - Push code to GitHub repository
   - Connect repository to Vercel
   - Configure environment variables in Vercel dashboard

2. **Set Environment Variables in Vercel**
   ```bash
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secure-secret-here
   NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 2: Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add NEXT_PUBLIC_API_BASE_URL

# Deploy to production
vercel --prod
```

## Seeded Test Accounts

The application comes with pre-seeded test accounts (password: `password`):

- **admin@acme.test** (Admin, Acme Corp)
- **user@acme.test** (Member, Acme Corp)
- **admin@globex.test** (Admin, Globex Corp)
- **user@globex.test** (Member, Globex Corp)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `GET /api/me` - Get current user info

### Notes Management
- `POST /api/notes` - Create note (respects quota limits)
- `GET /api/notes` - List tenant's notes
- `GET /api/notes/:id` - Get specific note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Admin Functions
- `POST /api/tenants/:slug/upgrade` - Upgrade tenant to Pro (Admin only)
- `POST /api/tenants/:slug/invite` - Invite user to tenant (Admin only)

### System
- `GET /api/health` - Health check

### Example API Usage

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.test","password":"password"}'

# Create Note
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"My Note","content":"Note content"}'

# Upgrade Tenant (Admin only)
curl -X POST http://localhost:3000/api/tenants/acme/upgrade \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Subscription Plans & Quotas

### Free Plan
- Limited to 3 notes per tenant
- Access to basic note CRUD operations
- Admin can invite users

### Pro Plan
- Unlimited notes
- All Free plan features
- Upgrade available via Admin users only

**Quota Enforcement**: Note creation uses atomic database transactions to prevent race conditions and ensure accurate quota enforcement.

## Testing

### Automated Test Suite

Run the comprehensive test suite:

```bash
# Local testing
chmod +x tests/run-tests.sh
./tests/run-tests.sh

# Testing deployed app
API_BASE_URL=https://your-app.vercel.app ./tests/run-tests.sh
```

### Test Coverage

The automated test suite validates:
- ✅ Health endpoint functionality
- ✅ Authentication with all seeded accounts
- ✅ Cross-tenant data isolation
- ✅ Role-based authorization (admin vs member)
- ✅ Free plan note quotas (3 note limit)
- ✅ Tenant upgrade functionality
- ✅ Complete CRUD operations
- ✅ Frontend accessibility

## Security Features

- **JWT Authentication**: HS256 signed tokens with user context
- **Password Security**: bcrypt hashing with salt rounds
- **Tenant Isolation**: Strict database-level isolation via `tenantId`
- **Role-based Authorization**: Admin and Member role enforcement
- **Input Validation**: Zod schema validation on all endpoints
- **CORS Configuration**: Properly configured for cross-origin requests

## Database Schema

```prisma
model Tenant {
  id        Int      @id @default(autoincrement())
  name      String
  slug      String   @unique
  plan      String   @default("free") // "free" | "pro"
  createdAt DateTime @default(now())
  users     User[]
  notes     Note[]
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  role      String   // "admin" | "member"
  tenantId  Int
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  createdAt DateTime @default(now())
}

model Note {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  tenantId  Int
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  createdBy Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed database with test data
npm run db:studio       # Open Prisma Studio

# Testing
npm run test            # Run automated test suite
```

## Project Structure

```
saas-notes-app/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── notes/        # Notes CRUD endpoints
│   │   ├── tenants/      # Tenant management
│   │   ├── me/           # User info endpoint
│   │   └── health/       # Health check
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main application page
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication utilities
│   └── db.ts             # Database connection
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema
│   ├── seed.ts           # Database seeding script
│   └── migrations/       # Database migrations
├── tests/                # Test suite
│   └── run-tests.sh      # Automated test script
└── package.json          # Dependencies and scripts
```

## Troubleshooting

### Common Issues

1. **Database Connection**
   - Ensure PostgreSQL is running
   - Verify `DATABASE_URL` is correct
   - Run `npx prisma migrate dev` to create tables

2. **JWT Errors**
   - Check `JWT_SECRET` environment variable
   - Ensure token is properly included in Authorization header

3. **CORS Issues**
   - Verify `NEXT_PUBLIC_API_BASE_URL` matches your deployment URL
   - Check CORS configuration in `next.config.js`

4. **Vercel Deployment**
   - Ensure all environment variables are set in Vercel dashboard
   - Check function logs in Vercel dashboard for errors
   - Verify database is accessible from Vercel

### Debug Commands

```bash
# Check database connection
npx prisma db pull

# View database in browser
npx prisma studio

# Check environment variables
echo $DATABASE_URL
echo $JWT_SECRET

# Test API endpoints
curl http://localhost:3000/api/health
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run the test suite
5. Submit a pull request

## License

MIT License - see LICENSE file for details
# Tennis Training Planner

A web application for creating, managing, and visualizing tennis training routines and drills with user authentication and cloud data storage.

## Features

- **User Authentication**: Secure email-based authentication with magic links
- **Visual Drill Creation**: Interactive tennis court with realistic dimensions and lines
- **Two-Click Shot System**: Click to set start point, click again for end point with arrow visualization
- **Player Movement Tracking**: Add player movement paths with dashed blue lines
- **Training Routines**: Combine multiple drills into structured training sessions
- **Session Playback**: Timer-based drill execution with play/pause/navigation controls
- **Multi-User Support**: Each user has their own drills and routines
- **Cloud Storage**: Supabase PostgreSQL database for reliable data persistence
- **Mobile Responsive**: Full-screen court editing on mobile devices

## Tech Stack

- **Frontend**: HTML5 Canvas, CSS3, Vanilla JavaScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with email/password
- **Deployment**: Vercel (static site)

## Local Development Setup

### Prerequisites
- Supabase CLI
- Git
- Web browser
- Local web server (optional)

### 1. Clone the Repository
```bash
git clone https://github.com/lwc-alex/tennis-drills-planner.git
cd tennis-drills-planner
```

### 2. Start Supabase Local Development
```bash
# Start Supabase local services
supabase start

# This will start:
# - PostgreSQL database on port 54322
# - Supabase API on port 54321
# - Supabase Studio on port 54323
# - Email testing server on port 54324
```

### 3. Start the Application
```bash
# Option 1: Simple HTTP server
python3 -m http.server 3000

# Option 2: Using Node.js http-server (if installed)
npx http-server -p 3000

# Option 3: Open index.html directly in browser
open index.html
```

### 4. Access the Application
- **Main App**: http://localhost:3000
- **Supabase Studio**: http://127.0.0.1:54323 (database admin)
- **Email Testing**: http://127.0.0.1:54324 (view email verification)

## Authentication Flow

### 🏠 **Local Development:**
1. Visit http://localhost:3000
2. Enter email and password 
3. Check http://127.0.0.1:54324 for verification emails
4. Create and manage your personal drills and routines

### 🌐 **Production:**
1. Visit https://tennis-drills-planner.vercel.app
2. Sign up with email and password
3. Check your real email for account verification
4. Sign in and start creating drills!

## Usage

### Creating Drills
1. Sign in with your email
2. Go to the "Drills" section
3. Click "Create New Drill"
4. Fill in drill name, description, and duration (in minutes)
5. Use the visual court editor:
   - **Add Player**: Click to place yellow player markers
   - **Add Shot**: Click start position, then click end position to create red shot arrows
   - **Add Movement**: Click start position, then click end position to create blue movement paths
   - **Clear Court**: Remove all elements

### Creating Routines
1. Go to the "Routines" section
2. Click "Create New Routine"
3. Select multiple drills to combine into a training routine

### Training Sessions
1. Go to the "Player" section
2. Select a routine from the dropdown
3. Click "Start Session" to begin timer-based training
4. Use controls to play/pause, navigate between drills

## Court Specifications

The tennis court follows official ITF (International Tennis Federation) specifications:
- Court dimensions: 23.77m × 10.97m (doubles)
- Singles court: 23.77m × 8.23m
- Service line distance from net: 6.40m
- Net height: 0.914m at center, 1.07m at posts

## Database Schema

### Tables
- **auth.users**: User authentication (managed by Supabase)
- **drills**: User-specific drill definitions with JSON court elements
- **routines**: User-specific routine definitions with drill associations

### Key Features
- All data is user-scoped with `user_id` foreign keys
- Court elements stored as JSON for flexible drill configurations
- UUID primary keys for security and scalability

## Project Structure

```
├── supabase/
│   ├── config.toml                          # Supabase local configuration
│   └── migrations/                          # Database schema migrations
│       └── 20250704005636_create_initial_schema.sql
├── app.js                                   # Main application logic
├── supabaseClient.js                       # Supabase client configuration
├── index.html                             # Main HTML template
├── styles.css                             # Application styles
└── vercel.json                            # Vercel deployment config
```

## Deployment

### 🚀 **Production Deployment**

The application is **already deployed** and ready to use:

**Live URL:** https://tennis-drills-planner.vercel.app

### 🔄 **Auto-Deployment Setup**

- **Platform:** Vercel (static site)
- **Database:** Supabase (production)
- **Authentication:** Email/password (no OAuth setup required)
- **Auto-deploy:** Connected to GitHub - pushes to `main` branch automatically deploy

### 🛠️ **Manual Deployment**

If needed, you can deploy manually:
```bash
vercel deploy --prod
```

### 📊 **Current Configuration**

- **Frontend:** Static site deployed to Vercel
- **Backend:** Supabase PostgreSQL with authentication
- **Tech Stack:** Vanilla JS + HTML + CSS (no build process required)
- **Authentication:** Email/password with email verification

## Mobile Features

- Tap the court on mobile to enter full-screen editing mode
- Full-screen court covers most of the screen for easier element placement
- Touch-friendly controls and responsive design

## Troubleshooting

### Supabase Issues
```bash
# Reset database and apply migrations
supabase db reset

# Check service status
supabase status

# Stop all services
supabase stop
```

### Development Issues
```bash
# Clear port 3000 if occupied
lsof -ti:3000 | xargs kill -9

# Start a different local server
python3 -m http.server 8000
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `supabase start && python3 -m http.server 3000`
5. Submit a pull request

## License

MIT License - see LICENSE file for details
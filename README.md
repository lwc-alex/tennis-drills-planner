# Tennis Training Planner

A web application for creating, managing, and visualizing tennis training routines and drills with persistent data storage.

## Features

- **Visual Drill Creation**: Interactive tennis court with realistic dimensions and lines
- **Two-Click Shot System**: Click to set start point, click again for end point with arrow visualization
- **Player Movement Tracking**: Add player movement paths with dashed blue lines
- **Training Routines**: Combine multiple drills into structured training sessions
- **Session Playback**: Timer-based drill execution with play/pause/navigation controls
- **Persistent Storage**: SQLite database for data persistence across sessions
- **Mobile Responsive**: Full-screen court editing on mobile devices

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

### Creating Drills
1. Go to the "Drills" section
2. Click "Create New Drill"
3. Fill in drill name, description, and duration (in minutes)
4. Use the visual court editor:
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

## Mobile Features

- Tap the court on mobile to enter full-screen editing mode
- Full-screen court covers most of the screen for easier element placement
- Touch-friendly controls and responsive design

## Technical Details

- **Frontend**: HTML5 Canvas, CSS3, Vanilla JavaScript
- **Backend**: Node.js with Express
- **Database**: SQLite for persistent storage
- **API**: RESTful endpoints for drills and routines management

## Development

For development with auto-restart:
```bash
npm run dev
```
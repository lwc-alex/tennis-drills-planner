const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const db = new sqlite3.Database('tennis_training.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS drills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        duration INTEGER NOT NULL,
        court_elements TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS routines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        drill_ids TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

app.get('/api/drills', (req, res) => {
    db.all('SELECT * FROM drills ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const drills = rows.map(row => ({
            ...row,
            courtElements: row.court_elements ? JSON.parse(row.court_elements) : []
        }));
        
        res.json(drills);
    });
});

app.post('/api/drills', (req, res) => {
    const { name, description, duration, courtElements } = req.body;
    
    const stmt = db.prepare('INSERT INTO drills (name, description, duration, court_elements) VALUES (?, ?, ?, ?)');
    stmt.run([name, description, duration, JSON.stringify(courtElements)], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            id: this.lastID,
            name,
            description,
            duration,
            courtElements,
            created_at: new Date().toISOString()
        });
    });
    stmt.finalize();
});

app.put('/api/drills/:id', (req, res) => {
    const { name, description, duration, courtElements } = req.body;
    const drillId = req.params.id;
    
    const stmt = db.prepare('UPDATE drills SET name = ?, description = ?, duration = ?, court_elements = ? WHERE id = ?');
    stmt.run([name, description, duration, JSON.stringify(courtElements), drillId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({ success: true, changes: this.changes });
    });
    stmt.finalize();
});

app.delete('/api/drills/:id', (req, res) => {
    const drillId = req.params.id;
    
    const stmt = db.prepare('DELETE FROM drills WHERE id = ?');
    stmt.run([drillId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({ success: true, changes: this.changes });
    });
    stmt.finalize();
});

app.get('/api/routines', (req, res) => {
    db.all('SELECT * FROM routines ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const routines = rows.map(row => ({
            ...row,
            drillIds: row.drill_ids ? JSON.parse(row.drill_ids) : []
        }));
        
        res.json(routines);
    });
});

app.post('/api/routines', (req, res) => {
    const { name, description, drillIds } = req.body;
    
    const stmt = db.prepare('INSERT INTO routines (name, description, drill_ids) VALUES (?, ?, ?)');
    stmt.run([name, description, JSON.stringify(drillIds)], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            id: this.lastID,
            name,
            description,
            drillIds,
            created_at: new Date().toISOString()
        });
    });
    stmt.finalize();
});

app.put('/api/routines/:id', (req, res) => {
    const { name, description, drillIds } = req.body;
    const routineId = req.params.id;
    
    const stmt = db.prepare('UPDATE routines SET name = ?, description = ?, drill_ids = ? WHERE id = ?');
    stmt.run([name, description, JSON.stringify(drillIds), routineId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({ success: true, changes: this.changes });
    });
    stmt.finalize();
});

app.delete('/api/routines/:id', (req, res) => {
    const routineId = req.params.id;
    
    const stmt = db.prepare('DELETE FROM routines WHERE id = ?');
    stmt.run([routineId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({ success: true, changes: this.changes });
    });
    stmt.finalize();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Tennis Training Planner server running on http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});
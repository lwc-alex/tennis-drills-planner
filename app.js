class TennisTrainingApp {
    constructor() {
        this.drills = [];
        this.routines = [];
        this.currentSession = null;
        this.currentDrillIndex = 0;
        this.sessionTimer = null;
        this.sessionStartTime = null;
        this.sessionPaused = false;
        this.drillTimer = null;
        this.drillStartTime = null;
        this.drillDuration = 0;
        this.drillPaused = false;
        
        this.currentTool = null;
        this.courtElements = [];
        this.pendingShot = null;
        this.pendingMovement = null;
        this.selectedPlayer = null;
        this.selectedShotPlayer = null;
        this.isMobileFullscreen = false;
        this.currentPlayerPositions = new Map(); // Track current positions during drill creation
        this.animationTimer = null;
        this.animationStartTime = null;
        this.animationDuration = 5000;
        this.isAnimationPlaying = false;
        this.editingDrill = null;
        this.editingRoutine = null;
        
        // Undo/Redo system
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSize = 50; // Limit undo history
        
        this.init();
    }

    async init() {
        this.checkMinimumHeight();
        this.bindEvents();
        await this.loadData();
        this.renderDrills();
        this.renderRoutines();
        this.updateRoutineSelect();
        this.showSection('drills');
        
        // Set up height monitoring
        window.addEventListener('resize', () => this.checkMinimumHeight());
    }

    checkMinimumHeight() {
        const minHeight = 700;
        const currentHeight = window.innerHeight;
        const heightWarning = document.getElementById('height-warning');
        const app = document.getElementById('app');
        const currentHeightSpan = document.getElementById('current-height');
        
        if (currentHeightSpan) {
            currentHeightSpan.textContent = currentHeight;
        }
        
        if (currentHeight < minHeight) {
            heightWarning.style.display = 'flex';
            app.style.display = 'none';
        } else {
            heightWarning.style.display = 'none';
            app.style.display = 'flex';
        }
    }

    bindEvents() {
        document.getElementById('nav-drills').addEventListener('click', () => this.showSection('drills'));
        document.getElementById('nav-routines').addEventListener('click', () => this.showSection('routines'));
        document.getElementById('nav-player').addEventListener('click', () => this.showSection('player'));

        document.getElementById('create-drill-btn').addEventListener('click', () => this.showDrillModal());
        document.getElementById('create-routine-btn').addEventListener('click', () => this.showRoutineModal());

        document.getElementById('close-drill-modal').addEventListener('click', () => this.hideDrillModal());
        document.getElementById('close-routine-modal').addEventListener('click', () => this.hideRoutineModal());
        document.getElementById('cancel-drill').addEventListener('click', () => this.hideDrillModal());
        document.getElementById('cancel-routine').addEventListener('click', () => this.hideRoutineModal());

        document.getElementById('drill-form').addEventListener('submit', (e) => this.saveDrill(e));
        document.getElementById('routine-form').addEventListener('submit', (e) => this.saveRoutine(e));

        document.getElementById('add-player-btn').addEventListener('click', () => this.setTool('player'));
        document.getElementById('add-shot-btn').addEventListener('click', () => this.setTool('shot'));
        document.getElementById('add-movement-btn').addEventListener('click', () => this.setTool('movement'));
        document.getElementById('clear-court-btn').addEventListener('click', () => this.clearCourt());
        document.getElementById('flip-horizontal-btn').addEventListener('click', () => this.flipHorizontal());
        document.getElementById('preview-animation-btn').addEventListener('click', () => this.toggleAnimationPreview());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        document.getElementById('play-animation-btn').addEventListener('click', () => this.playAnimation());
        document.getElementById('pause-animation-btn').addEventListener('click', () => this.pauseAnimation());
        document.getElementById('reset-animation-btn').addEventListener('click', () => this.resetAnimation());
        document.getElementById('timeline-slider').addEventListener('input', (e) => this.seekAnimation(e.target.value));
        
        document.getElementById('session-play-animation-btn').addEventListener('click', () => this.playSessionAnimation());
        document.getElementById('session-pause-animation-btn').addEventListener('click', () => this.pauseSessionAnimation());
        document.getElementById('session-reset-animation-btn').addEventListener('click', () => this.resetSessionAnimation());
        
        document.getElementById('close-preview-modal').addEventListener('click', () => this.hidePreviewModal());
        document.getElementById('preview-play-btn').addEventListener('click', () => this.playPreviewAnimation());
        document.getElementById('preview-pause-btn').addEventListener('click', () => this.pausePreviewAnimation());
        document.getElementById('preview-reset-btn').addEventListener('click', () => this.resetPreviewAnimation());
        document.getElementById('preview-timeline-slider').addEventListener('input', (e) => this.seekPreviewAnimation(e.target.value));
        
        // Add keyboard shortcuts for undo/redo
        document.addEventListener('keydown', (e) => {
            // Only apply shortcuts when drill modal is open and not typing in inputs
            if (!document.getElementById('drill-modal').classList.contains('hidden') && 
                !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'z' && !e.shiftKey) {
                        e.preventDefault();
                        this.undo();
                    } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                        e.preventDefault();
                        this.redo();
                    } else if (e.key === 'f') {
                        e.preventDefault();
                        this.flipHorizontal();
                    }
                }
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobileFullscreen) {
                this.exitMobileFullscreen();
            }
        });

        document.getElementById('start-session-btn').addEventListener('click', () => this.startSession());
        document.getElementById('play-pause-btn').addEventListener('click', () => this.toggleSession());
        document.getElementById('prev-drill-btn').addEventListener('click', () => this.previousDrill());
        document.getElementById('next-drill-btn').addEventListener('click', () => this.nextDrill());
        document.getElementById('stop-session-btn').addEventListener('click', () => this.stopSession());

        this.setupCanvasEvents();
    }

    setupCanvasEvents() {
        const drillCanvas = document.getElementById('drill-court-canvas');
        drillCanvas.addEventListener('click', (e) => this.handleCanvasClick(e, 'drill'));

        const sessionCanvas = document.getElementById('court-canvas');
        sessionCanvas.addEventListener('click', (e) => this.handleCanvasClick(e, 'session'));
    }

    handleCanvasClick(e, canvasType) {
        if (canvasType === 'drill' && !this.currentTool) {
            if (window.innerWidth <= 768) {
                this.enterMobileFullscreen();
            }
            return;
        }

        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const actualX = x * scaleX;
        const actualY = y * scaleY;

        if (canvasType === 'drill') {
            this.addCourtElement(actualX, actualY);
        }
    }

    addCourtElement(x, y) {
        if (!this.currentTool) {
            this.handleElementClick(x, y);
            return;
        }

        if (this.currentTool === 'player') {
            const element = {
                type: 'player',
                x: x,
                y: y,
                id: Date.now()
            };
            // Save state BEFORE making the change
            this.saveState('add_player');
            this.courtElements.push(element);
            // Track current position
            this.currentPlayerPositions.set(element.id, { x: x, y: y });
            this.drawCourt('drill-court-canvas');
        } else if (this.currentTool === 'shot') {
            if (!this.selectedShotPlayer) {
                const clickedPlayer = this.getPlayerAt(x, y);
                if (clickedPlayer) {
                    this.selectedShotPlayer = clickedPlayer;
                    this.drawCourt('drill-court-canvas');
                } else {
                    alert('Please click on a player first to add a shot.');
                }
            } else {
                const shotType = document.getElementById('shot-type').value;
                // Use current position of player
                const currentPos = this.currentPlayerPositions.get(this.selectedShotPlayer.id) || 
                                 { x: this.selectedShotPlayer.x, y: this.selectedShotPlayer.y };
                const element = {
                    type: 'shot',
                    playerId: this.selectedShotPlayer.id,
                    shotType: shotType,
                    startX: currentPos.x,
                    startY: currentPos.y,
                    endX: x,
                    endY: y,
                    id: Date.now(),
                    sequence: this.getNextSequenceNumber()
                };
                // Save state BEFORE making the change
                this.saveState('add_shot');
                this.courtElements.push(element);
                this.selectedShotPlayer = null;
                this.drawCourt('drill-court-canvas');
            }
        } else if (this.currentTool === 'movement') {
            if (!this.selectedPlayer) {
                const clickedPlayer = this.getPlayerAt(x, y);
                if (clickedPlayer) {
                    this.selectedPlayer = clickedPlayer;
                    this.drawCourt('drill-court-canvas');
                } else {
                    alert('Please click on a player first to add movement.');
                }
            } else {
                // Use current position of player
                const currentPos = this.currentPlayerPositions.get(this.selectedPlayer.id) || 
                                 { x: this.selectedPlayer.x, y: this.selectedPlayer.y };
                const element = {
                    type: 'movement',
                    playerId: this.selectedPlayer.id,
                    startX: currentPos.x,
                    startY: currentPos.y,
                    endX: x,
                    endY: y,
                    id: Date.now(),
                    sequence: this.getNextSequenceNumber()
                };
                // Save state BEFORE making the change
                this.saveState('add_movement');
                this.courtElements.push(element);
                // Update current position
                this.currentPlayerPositions.set(this.selectedPlayer.id, { x: x, y: y });
                this.selectedPlayer = null;
                this.drawCourt('drill-court-canvas');
            }
        }
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`add-${tool}-btn`).classList.add('active');
        
        // Show/hide shot type selector
        const shotTypeSelector = document.getElementById('shot-type-selector');
        if (tool === 'shot') {
            shotTypeSelector.classList.remove('hidden');
        } else {
            shotTypeSelector.classList.add('hidden');
        }
    }

    getPlayerAt(x, y) {
        return this.courtElements.find(element => {
            if (element.type === 'player') {
                // Use current position if available, otherwise use original position
                const currentPos = this.currentPlayerPositions.get(element.id) || 
                                  { x: element.x, y: element.y };
                const distance = Math.sqrt(Math.pow(currentPos.x - x, 2) + Math.pow(currentPos.y - y, 2));
                return distance <= 15;
            }
            return false;
        });
    }
    
    getPlayerNumber(playerId) {
        const players = this.courtElements.filter(e => e.type === 'player').sort((a, b) => a.id - b.id);
        return players.findIndex(p => p.id === playerId) + 1;
    }
    
    getNextSequenceNumber() {
        const allSequencedElements = this.courtElements.filter(e => 
            (e.type === 'shot' || e.type === 'movement') && e.sequence
        );
        return allSequencedElements.length > 0 ? 
            Math.max(...allSequencedElements.map(e => e.sequence)) + 1 : 1;
    }
    
    initializePlayerPositions() {
        this.currentPlayerPositions.clear();
        const players = this.courtElements.filter(e => e.type === 'player');
        players.forEach(player => {
            this.currentPlayerPositions.set(player.id, { x: player.x, y: player.y });
        });
        
        // Apply movements in sequence to get current positions
        const movements = this.courtElements.filter(e => e.type === 'movement');
        movements.forEach(movement => {
            this.currentPlayerPositions.set(movement.playerId, 
                { x: movement.endX, y: movement.endY });
        });
    }
    
    drawStaticElements(ctx) {
        // First, draw all player positions in sequence
        this.drawPlayerPositionSequence(ctx);
        
        // Draw shots with actual paths
        const shots = this.courtElements.filter(e => e.type === 'shot');
        shots.forEach(element => {
            // Draw shot as red arrow
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(element.startX, element.startY);
            ctx.lineTo(element.endX, element.endY);
            ctx.stroke();
            
            // Draw arrowhead
            const angle = Math.atan2(element.endY - element.startY, element.endX - element.startX);
            const arrowLength = 15;
            ctx.beginPath();
            ctx.moveTo(element.endX, element.endY);
            ctx.lineTo(
                element.endX - arrowLength * Math.cos(angle - Math.PI / 6),
                element.endY - arrowLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(element.endX, element.endY);
            ctx.lineTo(
                element.endX - arrowLength * Math.cos(angle + Math.PI / 6),
                element.endY - arrowLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
            
            // Show shot info
            if (element.playerId && element.shotType) {
                const playerNumber = this.getPlayerNumber(element.playerId);
                ctx.fillStyle = '#ff0000';
                ctx.font = '10px Arial';
                const midX = (element.startX + element.endX) / 2;
                const midY = (element.startY + element.endY) / 2;
                ctx.fillText(`P${playerNumber}: ${element.shotType} (${element.sequence || 1})`, 
                           midX + 10, midY - 5);
            }
        });
        
        // Draw movements
        const movements = this.courtElements.filter(e => e.type === 'movement');
        movements.forEach(element => {
            // Draw movement as blue dashed line
            ctx.strokeStyle = '#0066cc';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.moveTo(element.startX, element.startY);
            ctx.lineTo(element.endX, element.endY);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw movement arrowhead
            const angle = Math.atan2(element.endY - element.startY, element.endX - element.startX);
            const arrowLength = 12;
            ctx.beginPath();
            ctx.moveTo(element.endX, element.endY);
            ctx.lineTo(
                element.endX - arrowLength * Math.cos(angle - Math.PI / 6),
                element.endY - arrowLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(element.endX, element.endY);
            ctx.lineTo(
                element.endX - arrowLength * Math.cos(angle + Math.PI / 6),
                element.endY - arrowLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
            
            // Show movement info
            if (element.playerId) {
                const playerNumber = this.getPlayerNumber(element.playerId);
                ctx.fillStyle = '#0066cc';
                ctx.font = '10px Arial';
                const midX = (element.startX + element.endX) / 2;
                const midY = (element.startY + element.endY) / 2;
                ctx.fillText(`P${playerNumber}: Move (${element.sequence || 1})`, 
                           midX + 10, midY - 5);
            }
        });
    }
    
    drawPlayerPositionSequence(ctx) {
        const players = this.courtElements.filter(e => e.type === 'player');
        const shots = this.courtElements.filter(e => e.type === 'shot');
        const movements = this.courtElements.filter(e => e.type === 'movement');
        
        // Build a complete sequence of all player positions using unified sequence
        const playerPositions = new Map();
        const positionSequence = new Map(); // playerId -> [{x, y, sequence, type}]
        
        // Initialize starting positions
        players.forEach(player => {
            playerPositions.set(player.id, { x: player.x, y: player.y });
            positionSequence.set(player.id, [
                { x: player.x, y: player.y, sequence: 0, type: 'start' }
            ]);
        });
        
        // Process shots and movements in unified chronological order
        const allEvents = [
            ...shots.map(s => ({ ...s, eventType: 'shot' })),
            ...movements.map(m => ({ ...m, eventType: 'movement' }))
        ].sort((a, b) => (a.sequence || 1) - (b.sequence || 1));
        
        allEvents.forEach(event => {
            if (event.eventType === 'shot') {
                // Record shot position (where player is when hitting)
                const positions = positionSequence.get(event.playerId) || [];
                const currentPos = playerPositions.get(event.playerId);
                positions.push({
                    x: currentPos.x,
                    y: currentPos.y,
                    sequence: event.sequence,
                    type: 'shot'
                });
                positionSequence.set(event.playerId, positions);
            } else if (event.eventType === 'movement') {
                // Record movement end position
                const positions = positionSequence.get(event.playerId) || [];
                positions.push({
                    x: event.endX,
                    y: event.endY,
                    sequence: event.sequence,
                    type: 'movement'
                });
                positionSequence.set(event.playerId, positions);
                
                // Update current position for next events
                playerPositions.set(event.playerId, { x: event.endX, y: event.endY });
            }
        });
        
        // Draw all player positions with sequence numbers
        players.forEach(player => {
            const positions = positionSequence.get(player.id) || [];
            const playerNumber = this.getPlayerNumber(player.id);
            
            positions.forEach((pos, index) => {
                // Check if this player is selected
                const isSelected = (this.selectedPlayer && this.selectedPlayer.id === player.id) || 
                                  (this.selectedShotPlayer && this.selectedShotPlayer.id === player.id);
                
                // Draw position circle
                if (pos.type === 'start') {
                    ctx.fillStyle = '#ffff00'; // Yellow for starting position
                } else if (pos.type === 'shot') {
                    ctx.fillStyle = '#ff6666'; // Light red for shot positions
                } else {
                    ctx.fillStyle = '#66ccff'; // Light blue for movement positions
                }
                
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
                ctx.fill();
                
                // Draw border
                ctx.strokeStyle = isSelected ? '#ff0000' : '#000';
                ctx.lineWidth = isSelected ? 3 : 1;
                ctx.stroke();
                
                // Selection indicator
                if (isSelected && index === positions.length - 1) {
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
                
                // Draw player number and sequence
                ctx.fillStyle = '#000';
                ctx.font = 'bold 10px Arial';
                if (pos.sequence === 0) {
                    ctx.fillText(`P${playerNumber}`, pos.x - 12, pos.y - 12);
                } else {
                    ctx.fillText(`P${playerNumber}-${pos.sequence}`, pos.x - 15, pos.y - 12);
                }
            });
        });
    }
    
    handleElementClick(x, y) {
        if (this.currentTool === 'movement') {
            const clickedPlayer = this.getPlayerAt(x, y);
            if (clickedPlayer) {
                this.selectedPlayer = clickedPlayer;
                this.drawCourt('drill-court-canvas');
            }
        } else if (this.currentTool === 'shot') {
            const clickedPlayer = this.getPlayerAt(x, y);
            if (clickedPlayer) {
                this.selectedShotPlayer = clickedPlayer;
                this.drawCourt('drill-court-canvas');
            }
        }
    }

    clearCourt() {
        if (this.courtElements.length > 0) {
            this.saveState('clear_court');
        }
        this.courtElements = [];
        this.currentTool = null;
        this.pendingShot = null;
        this.pendingMovement = null;
        this.selectedPlayer = null;
        this.selectedShotPlayer = null;
        this.currentPlayerPositions.clear();
        this.stopAnimation();
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('animation-controls').classList.add('hidden');
        document.getElementById('shot-type-selector').classList.add('hidden');
        this.drawCourt('drill-court-canvas');
        // Reinitialize player positions
        this.initializePlayerPositions();
    }

    flipHorizontal() {
        if (this.courtElements.length === 0) {
            alert('No elements to flip!');
            return;
        }
        
        // Save state before flipping for undo
        this.saveState('flip_horizontal');
        
        // Court dimensions from drawCourt function
        const canvasWidth = 300;
        const margin = 30;
        const courtWidth = canvasWidth - (margin * 2);
        const centerX = margin + courtWidth / 2; // 150px
        
        // Flip all elements horizontally
        this.courtElements = this.courtElements.map(element => {
            const flippedElement = { ...element };
            
            if (element.type === 'player') {
                // Flip player position
                flippedElement.x = centerX * 2 - element.x;
            } else if (element.type === 'shot') {
                // Flip shot start and end positions
                flippedElement.startX = centerX * 2 - element.startX;
                flippedElement.endX = centerX * 2 - element.endX;
                // Y coordinates stay the same
            } else if (element.type === 'movement') {
                // Flip movement start and end positions
                flippedElement.startX = centerX * 2 - element.startX;
                flippedElement.endX = centerX * 2 - element.endX;
                // Y coordinates stay the same
            }
            
            return flippedElement;
        });
        
        // Update current player positions mapping
        this.initializePlayerPositions();
        
        // Redraw court
        this.drawCourt('drill-court-canvas');
        
        // Visual feedback
        const btn = document.getElementById('flip-horizontal-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Flipped!';
        btn.style.background = '#28a745';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 1000);
    }

    drawCourt(canvasId, isPreviewMode = false) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Tennis court background (clay court color)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate court dimensions (vertical layout)
        const margin = 30;
        const courtWidth = canvas.width - (margin * 2);
        const courtHeight = canvas.height - (margin * 2);
        const startX = margin;
        const startY = margin;
        
        // Draw court lines (white)
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        
        // Outer court boundary (doubles)
        ctx.strokeRect(startX, startY, courtWidth, courtHeight);
        
        // Singles sidelines
        const singlesWidth = courtWidth * 0.73;
        const singlesOffsetX = (courtWidth - singlesWidth) / 2;
        ctx.beginPath();
        ctx.moveTo(startX + singlesOffsetX, startY);
        ctx.lineTo(startX + singlesOffsetX, startY + courtHeight);
        ctx.moveTo(startX + courtWidth - singlesOffsetX, startY);
        ctx.lineTo(startX + courtWidth - singlesOffsetX, startY + courtHeight);
        ctx.stroke();
        
        // Center line (net)
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY + courtHeight / 2);
        ctx.lineTo(startX + courtWidth, startY + courtHeight / 2);
        ctx.stroke();
        
        // Service lines
        ctx.lineWidth = 2;
        const serviceLineOffset = courtHeight * 0.21;
        ctx.beginPath();
        ctx.moveTo(startX + singlesOffsetX, startY + serviceLineOffset);
        ctx.lineTo(startX + courtWidth - singlesOffsetX, startY + serviceLineOffset);
        ctx.moveTo(startX + singlesOffsetX, startY + courtHeight - serviceLineOffset);
        ctx.lineTo(startX + courtWidth - singlesOffsetX, startY + courtHeight - serviceLineOffset);
        ctx.stroke();
        
        // Center service line
        ctx.beginPath();
        ctx.moveTo(startX + courtWidth / 2, startY + serviceLineOffset);
        ctx.lineTo(startX + courtWidth / 2, startY + courtHeight - serviceLineOffset);
        ctx.stroke();
        
        // Baselines (thicker)
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + courtWidth, startY);
        ctx.moveTo(startX, startY + courtHeight);
        ctx.lineTo(startX + courtWidth, startY + courtHeight);
        ctx.stroke();

        if (isPreviewMode) {
            // In preview mode, don't draw individual elements - they'll be drawn by animation
            return;
        }

        // Draw static court elements (edit mode)
        this.drawStaticElements(ctx);
    }

    showSection(sectionName) {
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        
        document.getElementById(`${sectionName}-section`).classList.add('active');
        document.getElementById(`nav-${sectionName}`).classList.add('active');
    }

    showDrillModal() {
        document.getElementById('drill-modal').classList.remove('hidden');
        this.courtElements = [];
        this.currentTool = null;
        this.currentPlayerPositions.clear();
        this.clearUndoRedoHistory(); // Clear undo/redo when starting new/editing drill
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        this.drawCourt('drill-court-canvas');
        document.getElementById('drill-name').focus();
    }

    hideDrillModal() {
        document.getElementById('drill-modal').classList.add('hidden');
        document.getElementById('drill-form').reset();
        this.courtElements = [];
        this.currentTool = null;
        
        // Reset editing state
        this.editingDrill = null;
        
        // Reset modal title to default
        document.querySelector('#drill-modal .modal-header h3').textContent = 'Create New Drill';
        
        // Additional resets
        this.selectedPlayer = null;
        this.selectedShotPlayer = null;
        this.currentPlayerPositions.clear();
        
        // Clear any active tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        
        // Hide animation controls and shot type selector
        document.getElementById('animation-controls').classList.add('hidden');
        document.getElementById('shot-type-selector').classList.add('hidden');
    }

    showRoutineModal() {
        document.getElementById('routine-modal').classList.remove('hidden');
        this.renderDrillSelection();
        document.getElementById('routine-name').focus();
    }

    hideRoutineModal() {
        document.getElementById('routine-modal').classList.add('hidden');
        document.getElementById('routine-form').reset();
        
        // Reset editing state
        this.editingRoutine = null;
        
        // Reset modal title to default
        document.querySelector('#routine-modal .modal-header h3').textContent = 'Create New Routine';
    }

    renderDrillSelection() {
        const container = document.getElementById('routine-drills-selection');
        
        if (this.drills.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">No drills available. Create some drills first.</p>';
            return;
        }
        
        container.innerHTML = this.drills.map(drill => `
            <div class="drill-checkbox">
                <input type="checkbox" id="drill-${drill.id}" value="${drill.id}">
                <label for="drill-${drill.id}">
                    <strong>${drill.name}</strong> (${drill.duration}min)
                    ${drill.description ? `<br><small>${drill.description}</small>` : ''}
                </label>
            </div>
        `).join('');
    }

    async saveDrill(e) {
        e.preventDefault();
        
        const drill = {
            name: document.getElementById('drill-name').value,
            description: document.getElementById('drill-description').value,
            duration: parseFloat(document.getElementById('drill-duration').value),
            courtElements: [...this.courtElements]
        };
        
        try {
            let response;
            
            if (this.editingDrill) {
                // Update existing drill
                response = await fetch(`/api/drills/${this.editingDrill.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(drill)
                });
                
                if (response.ok) {
                    // Update drill in local array
                    const drillIndex = this.drills.findIndex(d => d.id === this.editingDrill.id);
                    if (drillIndex !== -1) {
                        this.drills[drillIndex] = { ...this.editingDrill, ...drill };
                    }
                    this.editingDrill = null;
                }
            } else {
                // Create new drill
                response = await fetch('/api/drills', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(drill)
                });
                
                if (response.ok) {
                    const savedDrill = await response.json();
                    this.drills.push(savedDrill);
                }
            }
            
            if (response.ok) {
                this.renderDrills();
                this.updateRoutineSelect();
                this.hideDrillModal();
            } else {
                alert('Failed to save drill');
            }
        } catch (error) {
            console.error('Error saving drill:', error);
            alert('Failed to save drill');
        }
    }

    async saveRoutine(e) {
        e.preventDefault();
        
        const selectedDrills = Array.from(document.querySelectorAll('#routine-drills-selection input:checked'))
            .map(checkbox => parseInt(checkbox.value));
        
        if (selectedDrills.length === 0) {
            alert('Please select at least one drill for the routine.');
            return;
        }
        
        const routine = {
            name: document.getElementById('routine-name').value,
            description: document.getElementById('routine-description').value,
            drillIds: selectedDrills
        };
        
        try {
            let response;
            
            if (this.editingRoutine) {
                // Update existing routine
                response = await fetch(`/api/routines/${this.editingRoutine.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(routine)
                });
                
                if (response.ok) {
                    // Update routine in local array
                    const routineIndex = this.routines.findIndex(r => r.id === this.editingRoutine.id);
                    if (routineIndex !== -1) {
                        this.routines[routineIndex] = { ...this.editingRoutine, ...routine };
                    }
                    this.editingRoutine = null;
                }
            } else {
                // Create new routine
                response = await fetch('/api/routines', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(routine)
                });
                
                if (response.ok) {
                    const savedRoutine = await response.json();
                    this.routines.push(savedRoutine);
                }
            }
            
            if (response.ok) {
                this.renderRoutines();
                this.updateRoutineSelect();
                this.hideRoutineModal();
            } else {
                alert('Failed to save routine');
            }
        } catch (error) {
            console.error('Error saving routine:', error);
            alert('Failed to save routine');
        }
    }

    async deleteDrill(drillId) {
        if (confirm('Are you sure you want to delete this drill?')) {
            try {
                const response = await fetch(`/api/drills/${drillId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    this.drills = this.drills.filter(drill => drill.id !== drillId);
                    this.routines = this.routines.map(routine => ({
                        ...routine,
                        drillIds: routine.drillIds.filter(id => id !== drillId)
                    }));
                    this.renderDrills();
                    this.renderRoutines();
                    this.updateRoutineSelect();
                } else {
                    alert('Failed to delete drill');
                }
            } catch (error) {
                console.error('Error deleting drill:', error);
                alert('Failed to delete drill');
            }
        }
    }

    async deleteRoutine(routineId) {
        if (confirm('Are you sure you want to delete this routine?')) {
            try {
                const response = await fetch(`/api/routines/${routineId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    this.routines = this.routines.filter(routine => routine.id !== routineId);
                    this.renderRoutines();
                    this.updateRoutineSelect();
                } else {
                    alert('Failed to delete routine');
                }
            } catch (error) {
                console.error('Error deleting routine:', error);
                alert('Failed to delete routine');
            }
        }
    }

    renderDrills() {
        const container = document.getElementById('drills-list');
        
        if (this.drills.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No drills yet</h3>
                    <p>Create your first drill to get started with training routines.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.drills.map(drill => `
            <div class="drill-card">
                <h3>${drill.name}</h3>
                <p>${drill.description || 'No description available'}</p>
                <div class="drill-meta">
                    <span>Duration: ${drill.duration}min</span>
                    <span>Elements: ${drill.courtElements?.length || 0}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-small btn-edit" onclick="app.previewDrill(${drill.id})">Preview</button>
                    <button class="btn-small btn-edit" onclick="app.editDrill(${drill.id})">Edit</button>
                    <button class="btn-small btn-replicate" onclick="app.replicateDrill(${drill.id})">Replicate</button>
                    <button class="btn-small btn-delete" onclick="app.deleteDrill(${drill.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    renderRoutines() {
        const container = document.getElementById('routines-list');
        
        if (this.routines.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No routines yet</h3>
                    <p>Create your first training routine by combining multiple drills.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.routines.map(routine => {
            const routineDrills = routine.drillIds.map(id => this.drills.find(d => d.id === id)).filter(Boolean);
            const totalDuration = routineDrills.reduce((sum, drill) => sum + drill.duration, 0);
            
            return `
                <div class="routine-card">
                    <h3>${routine.name}</h3>
                    <p>${routine.description || 'No description available'}</p>
                    <div class="routine-meta">
                        <span>Drills: ${routineDrills.length}</span>
                        <span>Duration: ${totalDuration}min</span>
                    </div>
                    <div class="routine-drills">
                        <h4>Drills:</h4>
                        <ul>
                            ${routineDrills.map(drill => `<li>${drill.name} (${drill.duration}min)</li>`).join('')}
                        </ul>
                    </div>
                    <div class="card-actions">
                        <button class="btn-small btn-edit" onclick="app.editRoutine(${routine.id})">Edit</button>
                        <button class="btn-small btn-replicate" onclick="app.replicateRoutine(${routine.id})">Replicate</button>
                        <button class="btn-small btn-delete" onclick="app.deleteRoutine(${routine.id})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateRoutineSelect() {
        const select = document.getElementById('routine-select');
        select.innerHTML = '<option value="">Select a routine</option>' +
            this.routines.map(routine => `<option value="${routine.id}">${routine.name}</option>`).join('');
    }

    startSession() {
        const routineId = parseInt(document.getElementById('routine-select').value);
        if (!routineId) {
            alert('Please select a routine first.');
            return;
        }
        
        const routine = this.routines.find(r => r.id === routineId);
        if (!routine) {
            alert('Routine not found.');
            return;
        }
        
        this.currentSession = {
            routine: routine,
            drills: routine.drillIds.map(id => this.drills.find(d => d.id === id)).filter(Boolean)
        };
        
        if (this.currentSession.drills.length === 0) {
            alert('This routine has no valid drills.');
            return;
        }
        
        this.currentDrillIndex = 0;
        document.getElementById('session-controls').classList.add('hidden');
        document.getElementById('session-display').classList.remove('hidden');
        
        this.loadCurrentDrill();
    }

    loadCurrentDrill() {
        if (!this.currentSession) return;
        
        const drill = this.currentSession.drills[this.currentDrillIndex];
        if (!drill) {
            this.stopSession();
            return;
        }
        
        document.getElementById('current-drill-name').textContent = drill.name;
        document.getElementById('drill-description').textContent = drill.description || '';
        
        this.courtElements = drill.courtElements || [];
        this.currentPlayerPositions.clear();
        this.initializePlayerPositions();
        this.drawCourt('court-canvas');
        this.setupSessionAnimation();
        
        this.drillDuration = drill.duration * 60;
        this.drillStartTime = null;
        this.drillPaused = false;
        this.updateTimerDisplay();
        
        document.getElementById('play-pause-btn').textContent = '▶️';
    }

    toggleSession() {
        if (!this.drillStartTime) {
            this.startDrillTimer();
        } else {
            if (this.drillPaused) {
                this.resumeDrillTimer();
            } else {
                this.pauseDrillTimer();
            }
        }
    }

    startDrillTimer() {
        this.drillStartTime = Date.now();
        this.drillPaused = false;
        document.getElementById('play-pause-btn').textContent = '⏸️';
        
        this.drillTimer = setInterval(() => {
            if (!this.drillPaused) {
                this.updateTimerDisplay();
            }
        }, 100);
    }

    pauseDrillTimer() {
        this.drillPaused = true;
        document.getElementById('play-pause-btn').textContent = '▶️';
    }

    resumeDrillTimer() {
        this.drillPaused = false;
        document.getElementById('play-pause-btn').textContent = '⏸️';
    }

    updateTimerDisplay() {
        if (!this.drillStartTime) {
            document.getElementById('timer-display').textContent = this.formatTime(this.drillDuration);
            return;
        }
        
        const elapsed = this.drillPaused ? 0 : (Date.now() - this.drillStartTime) / 1000;
        const remaining = Math.max(0, this.drillDuration - elapsed);
        
        document.getElementById('timer-display').textContent = this.formatTime(Math.ceil(remaining));
        
        if (remaining <= 0) {
            this.drillComplete();
        }
    }

    drillComplete() {
        clearInterval(this.drillTimer);
        this.drillTimer = null;
        this.drillStartTime = null;
        
        if (this.currentDrillIndex < this.currentSession.drills.length - 1) {
            setTimeout(() => {
                this.nextDrill();
            }, 1000);
        } else {
            alert('Training session complete! Great job!');
            this.stopSession();
        }
    }

    previousDrill() {
        if (this.currentDrillIndex > 0) {
            this.currentDrillIndex--;
            this.stopDrillTimer();
            this.loadCurrentDrill();
        }
    }

    nextDrill() {
        if (this.currentDrillIndex < this.currentSession.drills.length - 1) {
            this.currentDrillIndex++;
            this.stopDrillTimer();
            this.loadCurrentDrill();
        }
    }

    stopDrillTimer() {
        if (this.drillTimer) {
            clearInterval(this.drillTimer);
            this.drillTimer = null;
        }
        this.drillStartTime = null;
        this.drillPaused = false;
    }

    stopSession() {
        this.stopDrillTimer();
        this.currentSession = null;
        this.currentDrillIndex = 0;
        
        document.getElementById('session-controls').classList.remove('hidden');
        document.getElementById('session-display').classList.add('hidden');
        document.getElementById('routine-select').value = '';
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    drawPendingElement(canvasId) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        
        if (this.pendingShot) {
            ctx.strokeStyle = '#ff6666';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.pendingShot.startX, this.pendingShot.startY, 8, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        if (this.pendingMovement) {
            ctx.strokeStyle = '#6666ff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.pendingMovement.startX, this.pendingMovement.startY, 8, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    enterMobileFullscreen() {
        if (this.isMobileFullscreen) return;
        
        this.isMobileFullscreen = true;
        const container = document.getElementById('drill-court-container');
        const canvas = document.getElementById('drill-court-canvas');
        const tools = document.getElementById('drill-tools');
        
        container.classList.add('mobile-fullscreen');
        canvas.width = Math.min(window.innerWidth * 0.9, 400);
        canvas.height = Math.min(window.innerHeight * 0.7, 800);
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.className = 'mobile-close-btn';
        closeBtn.onclick = () => this.exitMobileFullscreen();
        
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'mobile-fullscreen-controls';
        controlsDiv.appendChild(tools.cloneNode(true));
        controlsDiv.appendChild(closeBtn);
        
        container.appendChild(controlsDiv);
        
        this.drawCourt('drill-court-canvas');
    }
    
    exitMobileFullscreen() {
        if (!this.isMobileFullscreen) return;
        
        this.isMobileFullscreen = false;
        const container = document.getElementById('drill-court-container');
        const canvas = document.getElementById('drill-court-canvas');
        
        container.classList.remove('mobile-fullscreen');
        canvas.width = 300;
        canvas.height = 600;
        
        const controls = container.querySelector('.mobile-fullscreen-controls');
        if (controls) {
            controls.remove();
        }
        
        this.drawCourt('drill-court-canvas');
    }

    toggleAnimationPreview() {
        const controls = document.getElementById('animation-controls');
        if (controls.classList.contains('hidden')) {
            controls.classList.remove('hidden');
            this.setupAnimation();
        } else {
            controls.classList.add('hidden');
            this.stopAnimation();
        }
    }
    
    setupAnimation() {
        const rally = this.createRallySequence();
        this.animationDuration = rally.length > 0 ? 
            Math.max(...rally.map(event => event.startTime + event.duration)) : 3000;
        
        const slider = document.getElementById('timeline-slider');
        slider.max = this.animationDuration;
        slider.value = 0;
        
        this.updateTimelineDisplay(0);
    }
    
    playAnimation() {
        if (this.isAnimationPlaying) return;
        
        this.isAnimationPlaying = true;
        this.animationStartTime = Date.now() - (parseInt(document.getElementById('timeline-slider').value) || 0);
        
        document.getElementById('play-animation-btn').classList.add('hidden');
        document.getElementById('pause-animation-btn').classList.remove('hidden');
        
        this.animationTimer = setInterval(() => {
            const elapsed = Date.now() - this.animationStartTime;
            const slider = document.getElementById('timeline-slider');
            
            if (elapsed >= this.animationDuration) {
                // Loop the animation
                this.animationStartTime = Date.now();
                slider.value = 0;
                this.updateTimelineDisplay(0);
                this.drawAnimationFrame(0);
                return;
            }
            
            slider.value = elapsed;
            this.updateTimelineDisplay(elapsed);
            this.drawAnimationFrame(elapsed);
        }, 50);
    }
    
    pauseAnimation() {
        this.isAnimationPlaying = false;
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }
        
        document.getElementById('play-animation-btn').classList.remove('hidden');
        document.getElementById('pause-animation-btn').classList.add('hidden');
    }
    
    resetAnimation() {
        this.pauseAnimation();
        document.getElementById('timeline-slider').value = 0;
        this.updateTimelineDisplay(0);
        this.drawCourt('drill-court-canvas');
    }
    
    seekAnimation(value) {
        const elapsed = parseInt(value);
        this.updateTimelineDisplay(elapsed);
        this.drawAnimationFrame(elapsed);
        
        if (this.isAnimationPlaying) {
            this.animationStartTime = Date.now() - elapsed;
        }
    }
    
    updateTimelineDisplay(elapsed) {
        const current = (elapsed / 1000).toFixed(1);
        const total = (this.animationDuration / 1000).toFixed(1);
        document.getElementById('timeline-display').textContent = `${current}s / ${total}s`;
    }
    
    drawAnimationFrame(elapsed) {
        this.drawCourt('drill-court-canvas', true);
        
        const canvas = document.getElementById('drill-court-canvas');
        const ctx = canvas.getContext('2d');
        
        const rally = this.createRallySequence();
        
        // Draw players at their current positions
        this.drawPlayersAtTime(ctx, elapsed, rally);
        
        // Draw the single ball following the rally sequence
        this.drawRallyBall(ctx, elapsed, rally);
        
        // Draw shot trails
        this.drawShotTrails(ctx, elapsed, rally);
    }
    
    drawAnimatedShot(ctx, shot, progress) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.3 + (progress * 0.7);
        
        const currentX = shot.startX + (shot.endX - shot.startX) * progress;
        const currentY = shot.startY + (shot.endY - shot.startY) * progress;
        
        ctx.beginPath();
        ctx.moveTo(shot.startX, shot.startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        
        ctx.fillStyle = '#ffff00';
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.globalAlpha = 1;
    }
    
    drawAnimatedMovement(ctx, movement, progress) {
        const player = this.courtElements.find(p => p.type === 'player' && p.id === movement.playerId);
        if (!player) return;
        
        ctx.strokeStyle = '#0066cc';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.globalAlpha = 0.5 + (progress * 0.5);
        
        const currentX = movement.startX + (movement.endX - movement.startX) * progress;
        const currentY = movement.startY + (movement.endY - movement.startY) * progress;
        
        ctx.beginPath();
        ctx.moveTo(movement.startX, movement.startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffff00';
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.globalAlpha = 1;
    }
    
    createRallySequence() {
        const shots = this.courtElements.filter(e => e.type === 'shot');
        const movements = this.courtElements.filter(e => e.type === 'movement');
        const players = this.courtElements.filter(e => e.type === 'player');
        
        // Create unified sequence of all events sorted by sequence number
        const allEvents = [
            ...shots.map(s => ({ ...s, eventType: 'shot' })),
            ...movements.map(m => ({ ...m, eventType: 'movement' }))
        ].sort((a, b) => (a.sequence || 1) - (b.sequence || 1));
        
        console.log('Processing events in sequence:', allEvents.map(e => `${e.eventType} ${e.sequence}`));
        
        // Constants for realistic speeds
        const BALL_SPEED = 200; // pixels per second
        const PLAYER_SPEED = 150; // pixels per second
        const SHOT_DELAY = 300; // ms delay after ball arrives before hitting
        
        const sequence = [];
        let currentTime = 0;
        const playerPositions = new Map();
        
        // Initialize player positions
        players.forEach(player => {
            playerPositions.set(player.id, { x: player.x, y: player.y });
        });
        
        // Process ALL events in true chronological order
        allEvents.forEach((event, index) => {
            if (event.eventType === 'shot') {
                const hittingPlayer = event.playerId;
                const hittingPlayerPos = playerPositions.get(hittingPlayer);
                const ballLandingX = event.endX;
                const ballLandingY = event.endY;
                
                // Calculate ball travel distance and duration
                const ballDistance = Math.sqrt(
                    Math.pow(ballLandingX - hittingPlayerPos.x, 2) + 
                    Math.pow(ballLandingY - hittingPlayerPos.y, 2)
                );
                const ballTravelDuration = (ballDistance / BALL_SPEED) * 1000;
                
                sequence.push({
                    type: 'shot',
                    startTime: currentTime,
                    duration: ballTravelDuration,
                    data: {
                        ...event,
                        playerPosition: hittingPlayerPos
                    },
                    action: 'travel'
                });
                
                console.log(`Shot ${event.sequence}: P${this.getPlayerNumber(hittingPlayer)} hits at ${currentTime}ms`);
                currentTime += ballTravelDuration + SHOT_DELAY;
                
            } else if (event.eventType === 'movement') {
                const movingPlayer = event.playerId;
                const currentPos = playerPositions.get(movingPlayer);
                
                // Calculate movement distance and duration
                const moveDistance = Math.sqrt(
                    Math.pow(event.endX - currentPos.x, 2) + 
                    Math.pow(event.endY - currentPos.y, 2)
                );
                const moveDuration = (moveDistance / PLAYER_SPEED) * 1000;
                
                sequence.push({
                    type: 'movement',
                    startTime: currentTime,
                    duration: moveDuration,
                    data: {
                        ...event,
                        startX: currentPos.x,
                        startY: currentPos.y
                    },
                    action: 'move'
                });
                
                // Update player position for future events
                playerPositions.set(movingPlayer, { x: event.endX, y: event.endY });
                
                console.log(`Movement ${event.sequence}: P${this.getPlayerNumber(movingPlayer)} moves at ${currentTime}ms`);
                currentTime += moveDuration;
            }
        });
        
        console.log('Final animation sequence:', sequence.map(s => `${s.type} at ${s.startTime}ms`));
        return sequence;
    }
    
    drawRallyBall(ctx, elapsed, rally) {
        let ballX = null;
        let ballY = null;
        let activeBall = false;
        
        // First check if we're currently in a shot
        for (let i = 0; i < rally.length; i++) {
            const event = rally[i];
            
            if (event.type === 'shot' && 
                elapsed >= event.startTime && 
                elapsed < event.startTime + event.duration) {
                
                const progress = (elapsed - event.startTime) / event.duration;
                const shot = event.data;
                
                // Use player's actual position at time of shot
                const startX = event.data.playerPosition ? event.data.playerPosition.x : shot.startX;
                const startY = event.data.playerPosition ? event.data.playerPosition.y : shot.startY;
                
                // Draw ball traveling along shot path
                ballX = startX + (shot.endX - startX) * progress;
                ballY = startY + (shot.endY - startY) * progress;
                activeBall = true;
                break; // Only show one ball at a time
            }
        }
        
        // If no active shot, find the last completed shot's end position
        if (!activeBall) {
            let lastCompletedShot = null;
            for (let i = 0; i < rally.length; i++) {
                const event = rally[i];
                if (event.type === 'shot' && elapsed >= event.startTime + event.duration) {
                    lastCompletedShot = event;
                }
            }
            
            if (lastCompletedShot) {
                const shot = lastCompletedShot.data;
                ballX = shot.endX;
                ballY = shot.endY;
            }
        }
        
        // Draw the ball if we have a position
        if (ballX !== null && ballY !== null) {
            this.drawTennisBall(ctx, ballX, ballY);
        }
    }
    
    drawTennisBall(ctx, x, y) {
        // Save context
        ctx.save();
        
        // Tennis ball emoji approach - draw a yellow circle with tennis ball pattern
        ctx.fillStyle = '#e6ff00'; // Bright tennis ball yellow
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add tennis ball seam lines
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Curved seam line 1
        ctx.arc(x, y, 7, -Math.PI/4, 3*Math.PI/4, false);
        ctx.stroke();
        
        ctx.beginPath();
        // Curved seam line 2 (opposite curve)
        ctx.arc(x, y, 7, 3*Math.PI/4, 7*Math.PI/4, false);
        ctx.stroke();
        
        // Add subtle shadow/depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(x + 1, y + 1, 10, 0, 2 * Math.PI);
        ctx.fill();
        
        // Restore context
        ctx.restore();
    }
    
    drawPlayersAtTime(ctx, elapsed, rally) {
        const players = this.courtElements.filter(e => e.type === 'player');
        const playerCurrentPositions = new Map();
        
        // Build a complete timeline of player positions
        const playerTimeline = new Map();
        players.forEach(player => {
            playerTimeline.set(player.id, [
                { time: 0, x: player.x, y: player.y }
            ]);
        });
        
        // Add all movement events to timeline
        rally.forEach(event => {
            if (event.type === 'movement' || event.type === 'auto_movement') {
                const playerId = event.data.playerId;
                const timeline = playerTimeline.get(playerId) || [];
                
                // Add end position to timeline
                timeline.push({
                    time: event.startTime + event.duration,
                    x: event.data.endX,
                    y: event.data.endY
                });
                
                playerTimeline.set(playerId, timeline.sort((a, b) => a.time - b.time));
            }
        });
        
        // Calculate current positions for each player
        players.forEach(player => {
            const timeline = playerTimeline.get(player.id);
            let currentPos = { x: player.x, y: player.y };
            
            // Find the latest completed position
            for (let i = timeline.length - 1; i >= 0; i--) {
                if (elapsed >= timeline[i].time) {
                    currentPos = { x: timeline[i].x, y: timeline[i].y };
                    break;
                }
            }
            
            // Check for any movement in progress
            rally.forEach(event => {
                if ((event.type === 'movement' || event.type === 'auto_movement') && 
                    event.data.playerId === player.id &&
                    elapsed >= event.startTime && elapsed < event.startTime + event.duration) {
                    
                    // Movement in progress - interpolate
                    const progress = (elapsed - event.startTime) / event.duration;
                    currentPos = {
                        x: event.data.startX + (event.data.endX - event.data.startX) * progress,
                        y: event.data.startY + (event.data.endY - event.data.startY) * progress
                    };
                }
            });
            
            playerCurrentPositions.set(player.id, currentPos);
        });
        
        // Draw each player at their current position (only once)
        players.forEach(player => {
            const pos = playerCurrentPositions.get(player.id);
            
            // Draw player at current position
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 10, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Show player number
            const playerNumber = this.getPlayerNumber(player.id);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('P' + playerNumber, pos.x - 15, pos.y - 15);
        });
    }
    
    drawShotTrails(ctx, elapsed, rally) {
        rally.forEach(event => {
            if (event.type === 'shot' && elapsed >= event.startTime) {
                const shot = event.data;
                const alpha = elapsed < event.startTime + event.duration ? 0.8 : 0.3;
                
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                
                // Use player's actual position at time of shot
                const startX = event.data.playerPosition ? event.data.playerPosition.x : shot.startX;
                const startY = event.data.playerPosition ? event.data.playerPosition.y : shot.startY;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(shot.endX, shot.endY);
                ctx.stroke();
                
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
                
                // Show shot info
                if (shot.shotType) {
                    const playerNumber = this.getPlayerNumber(shot.playerId);
                    ctx.fillStyle = alpha > 0.5 ? '#ff0000' : '#999';
                    ctx.font = '10px Arial';
                    const midX = (startX + shot.endX) / 2;
                    const midY = (startY + shot.endY) / 2;
                    ctx.fillText(`P${playerNumber}: ${shot.shotType}`, midX + 10, midY - 5);
                }
            }
        });
        
        // Draw movement trails
        rally.forEach(event => {
            if ((event.type === 'movement' || event.type === 'auto_movement') && 
                elapsed >= event.startTime) {
                
                const alpha = elapsed < event.startTime + event.duration ? 0.6 : 0.2;
                const color = event.type === 'auto_movement' ? '#00aa00' : '#0066cc';
                
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 8]);
                
                ctx.beginPath();
                ctx.moveTo(event.data.startX, event.data.startY);
                ctx.lineTo(event.data.endX, event.data.endY);
                ctx.stroke();
                
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
            }
        });
    }
    
    stopAnimation() {
        this.pauseAnimation();
        this.resetAnimation();
    }
    
    setupSessionAnimation() {
        const hasAnimatableElements = this.courtElements.some(e => e.type === 'shot' || e.type === 'movement');
        const controls = document.getElementById('session-animation-controls');
        
        if (hasAnimatableElements) {
            controls.classList.remove('hidden');
        } else {
            controls.classList.add('hidden');
        }
    }
    
    playSessionAnimation() {
        this.sessionAnimationPlaying = true;
        document.getElementById('session-play-animation-btn').classList.add('hidden');
        document.getElementById('session-pause-animation-btn').classList.remove('hidden');
        document.getElementById('session-reset-animation-btn').classList.remove('hidden');
        
        this.sessionAnimationStartTime = Date.now();
        this.sessionAnimationTimer = setInterval(() => {
            const elapsed = Date.now() - this.sessionAnimationStartTime;
            const duration = this.getSessionAnimationDuration();
            
            if (elapsed >= duration) {
                // Loop the animation
                this.sessionAnimationStartTime = Date.now();
                this.drawSessionAnimationFrame(0);
                return;
            }
            
            this.drawSessionAnimationFrame(elapsed);
        }, 50);
    }
    
    pauseSessionAnimation() {
        this.sessionAnimationPlaying = false;
        if (this.sessionAnimationTimer) {
            clearInterval(this.sessionAnimationTimer);
            this.sessionAnimationTimer = null;
        }
        
        document.getElementById('session-play-animation-btn').classList.remove('hidden');
        document.getElementById('session-pause-animation-btn').classList.add('hidden');
    }
    
    resetSessionAnimation() {
        this.pauseSessionAnimation();
        document.getElementById('session-play-animation-btn').classList.remove('hidden');
        document.getElementById('session-pause-animation-btn').classList.add('hidden');
        document.getElementById('session-reset-animation-btn').classList.add('hidden');
        
        this.drawCourt('court-canvas');
    }
    
    getSessionAnimationDuration() {
        const rally = this.createRallySequence();
        return rally.length > 0 ? 
            Math.max(...rally.map(event => event.startTime + event.duration)) : 3000;
    }
    
    drawSessionAnimationFrame(elapsed) {
        this.drawCourt('court-canvas', true);
        
        const canvas = document.getElementById('court-canvas');
        const ctx = canvas.getContext('2d');
        
        const rally = this.createRallySequence();
        
        // Draw players at their current positions
        this.drawPlayersAtTime(ctx, elapsed, rally);
        
        // Draw the single ball following the rally sequence
        this.drawRallyBall(ctx, elapsed, rally);
        
        // Draw shot trails
        this.drawShotTrails(ctx, elapsed, rally);
    }

    previewDrill(drillId) {
        const drill = this.drills.find(d => d.id === drillId);
        if (!drill) {
            alert('Drill not found');
            return;
        }
        
        // Set up preview data
        this.previewElements = drill.courtElements || [];
        this.previewAnimationPlaying = false;
        this.previewAnimationTimer = null;
        this.previewAnimationStartTime = null;
        
        // Show modal
        document.getElementById('preview-drill-title').textContent = `Preview: ${drill.name}`;
        document.getElementById('drill-preview-modal').classList.remove('hidden');
        
        // Draw initial state
        this.drawPreviewCourt();
        
        // Setup animation
        this.setupPreviewAnimation();
    }
    
    hidePreviewModal() {
        document.getElementById('drill-preview-modal').classList.add('hidden');
        this.stopPreviewAnimation();
        this.previewElements = [];
    }
    
    drawPreviewCourt() {
        const canvas = document.getElementById('preview-court-canvas');
        const ctx = canvas.getContext('2d');
        
        // Use the same court drawing logic
        const originalElements = this.courtElements;
        const originalPositions = new Map(this.currentPlayerPositions);
        
        this.courtElements = this.previewElements;
        this.initializePlayerPositions();
        this.drawCourt('preview-court-canvas');
        
        this.courtElements = originalElements;
        this.currentPlayerPositions = originalPositions;
    }
    
    setupPreviewAnimation() {
        const originalElements = this.courtElements;
        this.courtElements = this.previewElements;
        
        const rally = this.createRallySequence();
        this.previewAnimationDuration = rally.length > 0 ? 
            Math.max(...rally.map(event => event.startTime + event.duration)) : 3000;
        
        const slider = document.getElementById('preview-timeline-slider');
        slider.max = this.previewAnimationDuration;
        slider.value = 0;
        
        this.updatePreviewTimelineDisplay(0);
        this.courtElements = originalElements;
    }
    
    playPreviewAnimation() {
        if (this.previewAnimationPlaying) return;
        
        this.previewAnimationPlaying = true;
        this.previewAnimationStartTime = Date.now() - (parseInt(document.getElementById('preview-timeline-slider').value) || 0);
        
        document.getElementById('preview-play-btn').classList.add('hidden');
        document.getElementById('preview-pause-btn').classList.remove('hidden');
        
        this.previewAnimationTimer = setInterval(() => {
            const elapsed = Date.now() - this.previewAnimationStartTime;
            const slider = document.getElementById('preview-timeline-slider');
            
            if (elapsed >= this.previewAnimationDuration) {
                // Loop the animation
                this.previewAnimationStartTime = Date.now();
                slider.value = 0;
                this.updatePreviewTimelineDisplay(0);
                this.drawPreviewAnimationFrame(0);
                return;
            }
            
            slider.value = elapsed;
            this.updatePreviewTimelineDisplay(elapsed);
            this.drawPreviewAnimationFrame(elapsed);
        }, 50);
    }
    
    pausePreviewAnimation() {
        this.previewAnimationPlaying = false;
        if (this.previewAnimationTimer) {
            clearInterval(this.previewAnimationTimer);
            this.previewAnimationTimer = null;
        }
        
        document.getElementById('preview-play-btn').classList.remove('hidden');
        document.getElementById('preview-pause-btn').classList.add('hidden');
    }
    
    resetPreviewAnimation() {
        this.pausePreviewAnimation();
        document.getElementById('preview-timeline-slider').value = 0;
        this.updatePreviewTimelineDisplay(0);
        this.drawPreviewCourt();
    }
    
    seekPreviewAnimation(value) {
        const elapsed = parseInt(value);
        this.updatePreviewTimelineDisplay(elapsed);
        this.drawPreviewAnimationFrame(elapsed);
        
        if (this.previewAnimationPlaying) {
            this.previewAnimationStartTime = Date.now() - elapsed;
        }
    }
    
    updatePreviewTimelineDisplay(elapsed) {
        const current = (elapsed / 1000).toFixed(1);
        const total = (this.previewAnimationDuration / 1000).toFixed(1);
        document.getElementById('preview-timeline-display').textContent = `${current}s / ${total}s`;
    }
    
    drawPreviewAnimationFrame(elapsed) {
        const originalElements = this.courtElements;
        this.courtElements = this.previewElements;
        
        this.drawCourt('preview-court-canvas', true);
        
        const canvas = document.getElementById('preview-court-canvas');
        const ctx = canvas.getContext('2d');
        
        const rally = this.createRallySequence();
        
        // Draw players at their current positions
        this.drawPlayersAtTime(ctx, elapsed, rally);
        
        // Draw the single ball following the rally sequence
        this.drawRallyBall(ctx, elapsed, rally);
        
        // Draw shot trails
        this.drawShotTrails(ctx, elapsed, rally);
        
        this.courtElements = originalElements;
    }
    
    stopPreviewAnimation() {
        this.pausePreviewAnimation();
        this.resetPreviewAnimation();
    }

    editDrill(drillId) {
        const drill = this.drills.find(d => d.id === drillId);
        if (!drill) {
            alert('Drill not found');
            return;
        }
        
        // Set editing mode
        this.editingDrill = drill;
        
        // Show modal first (this will clear elements)
        this.showDrillModal();
        
        // Then populate form with existing data
        document.getElementById('drill-name').value = drill.name;
        document.getElementById('drill-description').value = drill.description || '';
        document.getElementById('drill-duration').value = drill.duration;
        
        // Load court elements AFTER showing modal
        this.courtElements = drill.courtElements || [];
        this.initializePlayerPositions();
        
        // Update modal title
        document.querySelector('#drill-modal .modal-header h3').textContent = 'Edit Drill';
        
        // Draw court with existing elements
        this.drawCourt('drill-court-canvas');
    }

    replicateDrill(drillId) {
        const drill = this.drills.find(d => d.id === drillId);
        if (!drill) {
            alert('Drill not found');
            return;
        }
        
        // DON'T set editingDrill - treat this as a new drill creation
        this.editingDrill = null;
        
        // Show modal first (this will clear elements)
        this.showDrillModal();
        
        // Then populate form with replicated data
        document.getElementById('drill-name').value = `${drill.name} (Copy)`;
        document.getElementById('drill-description').value = drill.description || '';
        document.getElementById('drill-duration').value = drill.duration;
        
        // Deep copy court elements with new IDs AFTER showing modal
        if (drill.courtElements && drill.courtElements.length > 0) {
            // Create a mapping of old player IDs to new player IDs
            const playerIdMapping = new Map();
            
            // First pass: create new IDs for all elements and build player ID mapping
            this.courtElements = drill.courtElements.map(element => {
                const newId = Date.now() + Math.random() * 1000 + Math.floor(Math.random() * 1000);
                
                // If it's a player, store the ID mapping
                if (element.type === 'player') {
                    playerIdMapping.set(element.id, newId);
                }
                
                return {
                    ...element,
                    id: newId
                };
            });
            
            // Second pass: update playerId references in shots and movements
            this.courtElements = this.courtElements.map(element => {
                if ((element.type === 'shot' || element.type === 'movement') && element.playerId) {
                    const newPlayerId = playerIdMapping.get(element.playerId);
                    if (newPlayerId) {
                        return {
                            ...element,
                            playerId: newPlayerId
                        };
                    }
                }
                return element;
            });
            
            this.initializePlayerPositions();
        }
        
        // Update modal title to indicate it's a replication
        document.querySelector('#drill-modal .modal-header h3').textContent = 'Create Drill (Replicated)';
        
        // Draw court with replicated elements
        this.drawCourt('drill-court-canvas');
    }

    editRoutine(routineId) {
        const routine = this.routines.find(r => r.id === routineId);
        if (!routine) {
            alert('Routine not found');
            return;
        }
        
        // Set editing mode
        this.editingRoutine = routine;
        
        // Populate form with existing data
        document.getElementById('routine-name').value = routine.name;
        document.getElementById('routine-description').value = routine.description || '';
        
        // Update modal title
        document.querySelector('#routine-modal .modal-header h3').textContent = 'Edit Routine';
        
        // Show modal and render drill selection
        this.showRoutineModal();
        
        // Pre-select the drills that are in this routine
        setTimeout(() => {
            const drillIds = routine.drillIds || [];
            drillIds.forEach(drillId => {
                const checkbox = document.querySelector(`input[value="${drillId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }, 100);
    }

    replicateRoutine(routineId) {
        const routine = this.routines.find(r => r.id === routineId);
        if (!routine) {
            alert('Routine not found');
            return;
        }
        
        // Create a copy of the routine with new ID and modified name
        const replicatedRoutine = {
            ...routine,
            id: Date.now(), // Generate new ID
            name: `${routine.name} (Copy)`,
            drillIds: [...routine.drillIds] // Copy drill IDs array
        };
        
        // Set editing mode with the replicated routine
        this.editingRoutine = replicatedRoutine;
        
        // Populate form with replicated data
        document.getElementById('routine-name').value = replicatedRoutine.name;
        document.getElementById('routine-description').value = replicatedRoutine.description || '';
        
        // Update modal title to indicate it's a replication
        document.querySelector('#routine-modal .modal-header h3').textContent = 'Replicate Routine';
        
        // Show modal and render drill selection
        this.showRoutineModal();
        
        // Pre-select the drills that are in the replicated routine
        setTimeout(() => {
            const drillIds = replicatedRoutine.drillIds || [];
            drillIds.forEach(drillId => {
                const checkbox = document.querySelector(`input[value="${drillId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }, 100);
    }

    async loadData() {
        try {
            const [drillsResponse, routinesResponse] = await Promise.all([
                fetch('/api/drills'),
                fetch('/api/routines')
            ]);
            
            if (drillsResponse.ok) {
                this.drills = await drillsResponse.json();
            }
            
            if (routinesResponse.ok) {
                this.routines = await routinesResponse.json();
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    // Undo/Redo system methods
    saveState(action = 'edit') {
        // Deep copy the current court elements
        const state = {
            courtElements: JSON.parse(JSON.stringify(this.courtElements)),
            currentPlayerPositions: new Map(this.currentPlayerPositions),
            action: action,
            timestamp: Date.now()
        };
        
        // Add to undo stack
        this.undoStack.push(state);
        
        // Clear redo stack when new action is performed
        this.redoStack = [];
        
        // Limit undo stack size
        if (this.undoStack.length > this.maxUndoSize) {
            this.undoStack.shift();
        }
        
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.undoStack.length === 0) return;
        
        // Save current state to redo stack
        const currentState = {
            courtElements: JSON.parse(JSON.stringify(this.courtElements)),
            currentPlayerPositions: new Map(this.currentPlayerPositions),
            action: 'current',
            timestamp: Date.now()
        };
        this.redoStack.push(currentState);
        
        // Restore previous state
        const previousState = this.undoStack.pop();
        this.courtElements = JSON.parse(JSON.stringify(previousState.courtElements));
        this.currentPlayerPositions = new Map(previousState.currentPlayerPositions);
        
        // Redraw court
        this.drawCourt('drill-court-canvas');
        
        this.updateUndoRedoButtons();
    }
    
    redo() {
        if (this.redoStack.length === 0) return;
        
        // Save current state to undo stack
        const currentState = {
            courtElements: JSON.parse(JSON.stringify(this.courtElements)),
            currentPlayerPositions: new Map(this.currentPlayerPositions),
            action: 'undo',
            timestamp: Date.now()
        };
        this.undoStack.push(currentState);
        
        // Restore next state
        const nextState = this.redoStack.pop();
        this.courtElements = JSON.parse(JSON.stringify(nextState.courtElements));
        this.currentPlayerPositions = new Map(nextState.currentPlayerPositions);
        
        // Redraw court
        this.drawCourt('drill-court-canvas');
        
        this.updateUndoRedoButtons();
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length === 0;
        }
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
        }
    }
    
    clearUndoRedoHistory() {
        this.undoStack = [];
        this.redoStack = [];
        this.updateUndoRedoButtons();
    }
}

const app = new TennisTrainingApp();

// Make functions globally available for onclick handlers
window.app = app;
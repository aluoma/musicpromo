// New position for anti-right-click logic, ensuring it loads before DOMContentLoaded.
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    console.log("Right-click disabled to protect content.");
});

document.addEventListener('DOMContentLoaded', () => {
    const desktop = document.getElementById('desktop');
    const toggles = document.querySelectorAll('.mode-toggle'); 
    const icons = document.querySelectorAll('.icon');
    const iconLinks = {
        'Spotify': 'https://open.spotify.com/artist/5JD93roKnQecDffPmlzF0Q?si=IxrFkZrRS36iwbRP3bYvBQ',
        'Apple Music': 'https://music.apple.com/ca/artist/aluoma/1790001361',
        'App 1': 'https://tidal.com/artist/53250905/u'
    };

    // --- Dragging State Variables ---
    let activeDrag = null;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    let isDragging = false;
    const DRAG_THRESHOLD = 5; // Minimum pixel movement to register as a drag

    // --- Persistence Functions ---
    function loadIconPositions() {
        icons.forEach(icon => {
            const label = icon.dataset.label;
            const savedPosition = localStorage.getItem(`iconPos_${label}`);
            if (savedPosition) {
                // If a saved position exists, apply it (overwriting the HTML default)
                try {
                    const { top, left } = JSON.parse(savedPosition);
                    icon.style.top = top + 'px';
                    icon.style.left = left + 'px';
                } catch (e) {
                    console.error("Failed to parse saved icon position:", e);
                }
            }
            // IMPORTANT: If savedPosition is NULL, we do nothing, allowing the 
            // inline style in index.html to set the default position.
        });
    }

    function saveIconPosition(icon) {
        const label = icon.dataset.label;
        // Use offsetTop and offsetLeft for current rendered position
        const top = icon.offsetTop;
        const left = icon.offsetLeft;
        localStorage.setItem(`iconPos_${label}`, JSON.stringify({ top, left }));
    }

    // --- Dragging Handlers (Combined Mouse/Touch) ---
    
    // Get cursor/touch position
    function getClientCoords(e) {
        if (e.touches) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function dragStart(e) {
        // Only start drag on left mouse button (0) or touch
        if (e.type === "mousedown" && e.button !== 0) return;
        
        // *** MODIFIED: Check if the click originated on the drag handle AREA (the hitbox) ***
        const handleArea = e.target.closest('.drag-handle-area');
        if (!handleArea) return; // Only proceed if the drag hitbox was clicked

        const icon = handleArea.closest('.icon');
        if (!icon) return;

        // Prevent default for touch events to stop scrolling/zooming
        if (e.type === "touchstart") {
            e.preventDefault();
        }

        activeDrag = icon;
        activeDrag.classList.add('dragging');

        const iconRect = activeDrag.getBoundingClientRect();
        const coords = getClientCoords(e);

        // Calculate offset (where the mouse/touch hit the icon's handle, relative to the icon's top-left corner)
        xOffset = coords.x - iconRect.left;
        yOffset = coords.y - iconRect.top;

        // Save initial coordinates to detect if it was a drag or just a click
        initialX = coords.x;
        initialY = coords.y;

        isDragging = false; // Reset drag flag
        
        // Attach listeners to the document
        document.addEventListener('mousemove', drag, { passive: false });
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', dragEnd);
    }

    function drag(e) {
        if (!activeDrag) return;
        e.preventDefault(); // Prevent text selection/native dragging
        
        const coords = getClientCoords(e);
        
        const currentX = coords.x;
        const currentY = coords.y;

        // Check if movement exceeds the threshold
        if (Math.abs(currentX - initialX) > DRAG_THRESHOLD || Math.abs(currentY - initialY) > DRAG_THRESHOLD) {
            isDragging = true;
        }

        // Calculate new position
        let newX = currentX - xOffset;
        let newY = currentY - yOffset;
        
        // --- Boundary Checks ---
        const taskbarHeight = document.getElementById('taskbar').offsetHeight;
        const desktopRect = desktop.getBoundingClientRect();
        const iconWidth = activeDrag.offsetWidth;
        const iconHeight = activeDrag.offsetHeight;
        
        // X-axis bounds
        newX = Math.max(0, newX); // Left boundary
        newX = Math.min(desktopRect.width - iconWidth, newX); // Right boundary

        // Y-axis bounds (must stay above the taskbar)
        newY = Math.max(0, newY); // Top boundary
        newY = Math.min(desktopRect.height - taskbarHeight - iconHeight, newY); // Bottom boundary
        // --- End Boundary Checks ---

        activeDrag.style.left = newX + 'px';
        activeDrag.style.top = newY + 'px';
    }

    function dragEnd(e) {
        if (!activeDrag) return;

        activeDrag.classList.remove('dragging');
        
        // If it was a drag (moved more than threshold), save the position
        if (isDragging) {
            saveIconPosition(activeDrag);
        }

        activeDrag = null;
        // isDragging remains true until the dblclick check or reset
        
        // Remove listeners from the document
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', dragEnd);
    }
    
    // Attach drag start listeners to the icon's drag handle area
    icons.forEach(icon => {
        const handleArea = icon.querySelector('.drag-handle-area');
        if (handleArea) {
            handleArea.addEventListener('mousedown', dragStart);
            handleArea.addEventListener('touchstart', dragStart, { passive: false });
        }
    });
    
    // --- App Launch Logic ---
    icons.forEach(icon => {
        icon.addEventListener('dblclick', (e) => {
            // *** UPDATED: Check if the click originated on the drag handle area
            if (e.target.closest('.drag-handle-area')) {
                return;
            }
            
            // Check if the double-click was preceded by a drag motion
            if (isDragging) {
                isDragging = false; // Reset the flag
                return; // Suppress double-click if it was a drag
            }
            
            const label = icon.dataset.label;
            const url = iconLinks[label];

            if (label === 'WHO_ARE_YOU_? mxtp_shoot') {
                window.open(
                    'folder-explorer.html', 
                    'FolderWindow', 
                    'width=700,height=500,scrollbars=yes,resizable=yes'
                );
            } else if (url) {
                window.open(url, '_blank');
            } else {
                console.log(`Attempting to open folder: ${label}`);
            }
        });
    });
    
    // --- Dark/Light Mode Core Logic (Unchanged) ---
    function switchMode(newMode) {
        desktop.className = '';
        desktop.classList.add(newMode);
        localStorage.setItem('currentMode', newMode); 
    }
    
    function applySavedMode() {
        const savedMode = localStorage.getItem('currentMode') || 'light-mode';
        switchMode(savedMode);
    }

    applySavedMode();
    loadIconPositions(); // Load positions after theme to ensure correct background/contrast
    
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            if (desktop.classList.contains('light-mode')) {
                switchMode('dark-mode');
            } else {
                switchMode('light-mode');
            }
        });
    });
    
});
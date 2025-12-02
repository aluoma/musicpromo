// Anti-right-click logic
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    console.log("Right-click disabled to protect content.");
});

document.addEventListener('DOMContentLoaded', () => {
    const desktop = document.getElementById('desktop');
    const toggles = document.querySelectorAll('.mode-toggle'); 
    const icons = document.querySelectorAll('.icon');
    const folderWindow = document.getElementById('folder-window'); 
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');

    // --- NEW LIGHTBOX ELEMENTS ---
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomLevelSpan = document.getElementById('zoom-level');
    const navPrevBtn = document.getElementById('nav-prev');
    const navNextBtn = document.getElementById('nav-next');
    
    // --- NEW LIGHTBOX STATE ---
    let currentZoom = 100; // Start at 100%
    const ZOOM_STEP = 25;
    let coverImages = []; // Array to hold image elements for navigation
    let currentImageIndex = -1; // Index of the currently displayed image

    const iconLinks = {
        'Spotify': 'https://open.spotify.com/artist/5JD93roKnQecDffPmlzF0Q?si=IxrFkZrRS36iwbRP3bYvBQ',
        'Apple Music': 'https://music.apple.com/ca/artist/aluoma/1790001361',
        'App 1': 'https://tidal.com/artist/53250905'
    };

    // --- Dragging State Variables (for Icons) ---
    let activeDrag = null;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    let isDragging = false;
    const DRAG_THRESHOLD = 5; 
    
    // --- Window Dragging State Variables ---
    let windowDragActive = false;
    let windowInitialX, windowInitialY;
    let windowOffsetX, windowOffsetY;

    // --- Persistence Functions ---
    // NOTE: Using a placeholder implementation for the required __app_id variable
    function getAppId() {
        return typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    }

    function loadIconPositions() {
        const appId = getAppId();
        icons.forEach(icon => {
            const label = icon.dataset.label;
            const storageKey = `iconPos_${appId}_${label}`;
            const savedPosition = localStorage.getItem(storageKey);
            if (savedPosition) {
                try {
                    const { top, left } = JSON.parse(savedPosition);
                    icon.style.top = top + 'px';
                    icon.style.left = left + 'px';
                } catch (e) {
                    console.error("Failed to parse saved icon position:", e);
                }
            }
        });
    }

    function saveIconPosition(icon) {
        const label = icon.dataset.label;
        const top = icon.offsetTop;
        const left = icon.offsetLeft;
        const appId = getAppId(); 
        const storageKey = `iconPos_${appId}_${label}`;
        localStorage.setItem(storageKey, JSON.stringify({ top, left }));
    }

    // --- Utility: Get cursor/touch position ---
    function getClientCoords(e) {
        if (e.touches) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    // -------------------------------------------------------------------------
    // --- ICON Dragging Logic (Updated for full icon drag) ---
    // -------------------------------------------------------------------------
    function dragStart(e) {
        // Allow only left-click for mouse or any touch
        if (e.type === "mousedown" && e.button !== 0) return;
        
        const icon = e.target.closest('.icon');
        if (!icon) return;

        // Prevent drag from starting if clicking inside the folder window
        if (folderWindow.style.display !== 'none' && e.target.closest('.app-window')) return;

        if (e.type === "touchstart") {
            e.preventDefault();
        }

        activeDrag = icon;
        activeDrag.classList.add('dragging');

        const iconRect = activeDrag.getBoundingClientRect();
        const coords = getClientCoords(e);

        // Calculate offset from click point to the icon's top-left corner
        xOffset = coords.x - iconRect.left;
        yOffset = coords.y - iconRect.top;
        initialX = coords.x;
        initialY = coords.y;
        isDragging = false; 
        
        document.addEventListener('mousemove', drag, { passive: false });
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', dragEnd);
    }

    function drag(e) {
        if (!activeDrag) return;
        e.preventDefault(); 
        
        const coords = getClientCoords(e);
        const currentX = coords.x;
        const currentY = coords.y;

        // Determine if movement exceeds threshold to be considered a drag
        if (Math.abs(currentX - initialX) > DRAG_THRESHOLD || Math.abs(currentY - initialY) > DRAG_THRESHOLD) {
            isDragging = true;
        }

        let newX = currentX - xOffset;
        let newY = currentY - yOffset;
        
        // Bounding box logic
        const taskbarHeight = document.getElementById('taskbar').offsetHeight;
        const desktopRect = desktop.getBoundingClientRect();
        const iconWidth = activeDrag.offsetWidth;
        const iconHeight = activeDrag.offsetHeight;
        
        // Clamp X position
        newX = Math.max(0, newX); 
        newX = Math.min(desktopRect.width - iconWidth, newX); 

        // Clamp Y position (respecting taskbar)
        newY = Math.max(0, newY); 
        newY = Math.min(desktopRect.height - taskbarHeight - iconHeight, newY); 

        activeDrag.style.left = newX + 'px';
        activeDrag.style.top = newY + 'px';
    }

    function dragEnd(e) {
        if (!activeDrag) return;

        activeDrag.classList.remove('dragging');
        
        if (isDragging) {
            saveIconPosition(activeDrag);
        }

        activeDrag = null;
        
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', dragEnd);
    }
    
    // Attach drag listeners directly to the icons
    icons.forEach(icon => {
        icon.addEventListener('mousedown', dragStart);
        icon.addEventListener('touchstart', dragStart, { passive: false });
    });


    // -------------------------------------------------------------------------
    // --- WINDOW Dragging Logic ---
    // -------------------------------------------------------------------------

    function startWindowDrag(e) {
        const windowHeader = e.target.closest('.window-header');
        if (!windowHeader || e.button !== 0) return; 

        e.preventDefault();
        windowDragActive = true;
        
        const coords = getClientCoords(e);
        windowInitialX = coords.x;
        windowInitialY = coords.y;
        
        windowOffsetX = coords.x - folderWindow.getBoundingClientRect().left;
        windowOffsetY = coords.y - folderWindow.getBoundingClientRect().top;

        document.addEventListener('mousemove', dragWindow);
        document.addEventListener('mouseup', endWindowDrag);
        document.addEventListener('touchmove', dragWindow, { passive: false });
        document.addEventListener('touchend', endWindowDrag);

        folderWindow.style.transition = 'none'; 
    }

    function dragWindow(e) {
        if (!windowDragActive) return;

        e.preventDefault();
        const coords = getClientCoords(e);

        let newX = coords.x - windowOffsetX;
        let newY = coords.y - windowOffsetY;

        folderWindow.style.left = newX + 'px';
        folderWindow.style.top = newY + 'px';
        folderWindow.style.transform = 'none'; 
    }

    function endWindowDrag() {
        if (!windowDragActive) return;

        windowDragActive = false;
        folderWindow.style.transition = ''; 

        document.removeEventListener('mousemove', dragWindow);
        document.removeEventListener('mouseup', endWindowDrag);
        document.removeEventListener('touchmove', dragWindow);
        document.removeEventListener('touchend', endWindowDrag);
    }
    
    // -------------------------------------------------------------------------
    // --- WINDOW Control Logic ---
    // -------------------------------------------------------------------------
    function closeWindow() {
        folderWindow.style.display = 'none';
    }
    
    if (folderWindow) {
        const header = folderWindow.querySelector('.window-header');
        if (header) {
            header.addEventListener('mousedown', startWindowDrag);
            header.addEventListener('touchstart', startWindowDrag, { passive: false });
        }
        folderWindow.querySelector('.close-btn').addEventListener('click', closeWindow);
    }

    // -------------------------------------------------------------------------
    // --- LIGHTBOX Logic (Updated for Zoom and Navigation) ---
    // -------------------------------------------------------------------------

    function applyZoom() {
        // Set the new scale factor based on the current zoom percentage
        lightboxImage.style.transform = `scale(${currentZoom / 100})`;
        zoomLevelSpan.textContent = `${currentZoom}%`;
        
        // Optional: Disable zoom buttons at min/max levels
        zoomOutBtn.disabled = (currentZoom <= ZOOM_STEP);
        zoomInBtn.disabled = (currentZoom >= 200); // Max zoom set to 200%
    }

    function zoom(direction) {
        const newZoom = currentZoom + (direction * ZOOM_STEP);
        // Clamp the zoom level between a minimum (e.g., 25%) and maximum (e.g., 200%)
        if (newZoom >= ZOOM_STEP && newZoom <= 200) {
            currentZoom = newZoom;
            applyZoom();
        }
    }

    function navigate(direction) {
        // Only navigate if we have images loaded
        if (coverImages.length === 0) return;
        
        let newIndex = currentImageIndex + direction;
        
        // Wrap around navigation
        if (newIndex < 0) {
            newIndex = coverImages.length - 1;
        } else if (newIndex >= coverImages.length) {
            newIndex = 0;
        }

        // Only proceed if there's a valid index
        if (newIndex >= 0 && newIndex < coverImages.length) {
            currentImageIndex = newIndex;
            const newImageSrc = coverImages[currentImageIndex].src;
            lightboxImage.src = newImageSrc;
            
            // Reset zoom when changing image
            currentZoom = 100;
            applyZoom();
        }
    }

    function showLightbox(imageElement, index) {
        currentImageIndex = index;
        currentZoom = 100; // Reset zoom for new image
        
        lightboxImage.src = imageElement.src;
        applyZoom(); // Apply the reset zoom state
        
        lightbox.classList.remove('hidden');
    }
    
    // Collect all cover images once DOM is loaded
    // This must happen after the elements are guaranteed to be in the DOM
    coverImages = Array.from(document.querySelectorAll('.cover-img'));
    
    coverImages.forEach((img, index) => {
        img.addEventListener('click', (e) => {
            e.stopPropagation(); 
            showLightbox(img, index);
        });
    });

    // Attach zoom event listeners
    if (zoomInBtn && zoomOutBtn) {
        zoomInBtn.addEventListener('click', () => zoom(1)); // 1 for zoom in
        zoomOutBtn.addEventListener('click', () => zoom(-1)); // -1 for zoom out
    }
    
    // Attach navigation event listeners
    if (navPrevBtn && navNextBtn) {
        navPrevBtn.addEventListener('click', (e) => { 
            e.stopPropagation(); // Prevent closing lightbox
            navigate(-1); 
        });
        navNextBtn.addEventListener('click', (e) => { 
            e.stopPropagation(); // Prevent closing lightbox
            navigate(1); 
        });
    }


    // Close lightbox on click, but ensure we don't close when clicking controls or image
    lightbox.addEventListener('click', (e) => {
        // Check if the click target is the lightbox background itself
        if (e.target.id === 'lightbox') {
            lightbox.classList.add('hidden');
            setTimeout(() => {
                lightboxImage.src = ''; 
                lightboxImage.style.transform = 'none'; // Clean up transform
            }, 300);
        }
        // Note: Clicking lightbox-content (which holds the image/arrows) will NOT close it now.
    });


    // -------------------------------------------------------------------------
    // --- App Launch Logic (Uses single click with drag check) ---
    // -------------------------------------------------------------------------
    icons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            // If dragging just finished, prevent the click action
            if (isDragging) {
                isDragging = false; 
                return; 
            }
            
            const label = icon.dataset.label;
            const url = iconLinks[label];

            if (label === 'WHO_ARE_YOU_? mxtp_shoot') {
                folderWindow.style.display = 'flex';
                folderWindow.style.zIndex = 1001; 
                
                // Ensure folder window position is centered if first time opening or off-screen
                const windowRect = folderWindow.getBoundingClientRect();
                if (windowRect.top < 0 || windowRect.left < 0 || windowRect.bottom > desktop.clientHeight || windowRect.right > desktop.clientWidth) {
                    folderWindow.style.top = '50%';
                    folderWindow.style.left = '50%';
                    folderWindow.style.transform = 'translate(-50%, -50%)';
                }

            } else if (url) {
                window.open(url, '_blank');
            } else {
                console.log(`Attempting to open generic folder/app: ${label}`);
            }
        });

        // Prevent double-click from firing after single click delay
        icon.addEventListener('dblclick', (e) => {
             e.preventDefault();
        });
    });
    
    // --- Dark/Light Mode Core Logic ---
    function switchMode(newMode) {
        desktop.className = '';
        desktop.classList.add(newMode);
        const appId = getAppId(); 
        localStorage.setItem(`currentMode_${appId}`, newMode); 
    }
    
    function applySavedMode() {
        const appId = getAppId(); 
        const savedMode = localStorage.getItem(`currentMode_${appId}`) || 'light-mode';
        switchMode(savedMode);
        // Sync the toggle state visually if needed (not strictly required since the toggle is clickable)
    }

    applySavedMode();
    loadIconPositions(); 
    
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
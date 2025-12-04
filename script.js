document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    console.log("Right-click disabled to protect content.");
});

document.addEventListener('DOMContentLoaded', () => {
    const desktop = document.getElementById('desktop');
    const toggles = document.querySelectorAll('.mode-toggle'); 
    const icons = document.querySelectorAll('.icon');
    const folderWindow = document.getElementById('folder-window');
    const promoWindow = document.getElementById('promo-window');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');

    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomLevelSpan = document.getElementById('zoom-level');
    const navPrevBtn = document.getElementById('nav-prev');
    const navNextBtn = document.getElementById('nav-next');
    let currentZoom = 100;
    const ZOOM_STEP = 25;
    let coverImages = [];
    let promoImages = [];
    let currentImageIndex = -1;
    let currentImageSet = null;

    const iconLinks = {
        'Spotify': 'https://open.spotify.com/artist/5JD93roKnQecDffPmlzF0Q?si=IxrFkZrRS36iwbRP3bYvBQ',
        'Apple Music': 'https://music.apple.com/ca/artist/aluoma/1790001361',
        'App 1': 'https://tidal.com/artist/53250905'
    };

    let activeDrag = null;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    let isDragging = false;
    const DRAG_THRESHOLD = 5; 
    let touchTimer = null;
    let touchInitialX = 0;
    let touchInitialY = 0;
    const TOUCH_LONGPRESS_MS = 300;
    const TOUCH_MOVE_THRESHOLD = 10;
    
    let windowDragActive = false;
    let windowInitialX, windowInitialY;
    let windowOffsetX, windowOffsetY;
    let activeWindow = null;

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

    function getClientCoords(e) {
        if (e.touches) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function dragStart(e) {
        if (e.type === "mousedown" && e.button !== 0) return;
        
        const icon = e.target.closest('.icon');
        if (!icon) return;

        if (folderWindow.style.display !== 'none' && e.target.closest('.app-window')) return;

        if (e.type === "touchstart") {
            e.preventDefault();
        }

        activeDrag = icon;
        activeDrag.classList.add('dragging');

        const iconRect = activeDrag.getBoundingClientRect();
        const coords = getClientCoords(e);

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

        if (Math.abs(currentX - initialX) > DRAG_THRESHOLD || Math.abs(currentY - initialY) > DRAG_THRESHOLD) {
            isDragging = true;
        }

        let newX = currentX - xOffset;
        let newY = currentY - yOffset;
        
        const taskbarHeight = document.getElementById('taskbar').offsetHeight;
        const desktopRect = desktop.getBoundingClientRect();
        const iconWidth = activeDrag.offsetWidth;
        const iconHeight = activeDrag.offsetHeight;
        
        newX = Math.max(0, newX); 
        newX = Math.min(desktopRect.width - iconWidth, newX); 

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
    
    function updateForMobileLayout() {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (isMobile) {
            desktop.classList.add('mobile-layout');
            icons.forEach(icon => {
                icon.removeEventListener('mousedown', dragStart);
                icon.removeEventListener('touchstart', dragStart);
                icon.removeEventListener('touchstart', touchIconStart);
                icon.removeEventListener('touchmove', touchIconMove);
                icon.removeEventListener('touchend', touchIconEnd);

                icon.addEventListener('touchstart', touchIconStart, { passive: false });
                icon.addEventListener('touchmove', touchIconMove, { passive: false });
                icon.addEventListener('touchend', touchIconEnd);
                icon.classList.remove('dragging');
            });
        } else {
            desktop.classList.remove('mobile-layout');
            icons.forEach(icon => {
                icon.removeEventListener('mousedown', dragStart);
                icon.removeEventListener('touchstart', dragStart);
                icon.removeEventListener('touchstart', touchIconStart);
                icon.removeEventListener('touchmove', touchIconMove);
                icon.removeEventListener('touchend', touchIconEnd);
                icon.addEventListener('mousedown', dragStart);
                icon.addEventListener('touchstart', dragStart, { passive: false });
            });
        }
    }

    updateForMobileLayout();
    window.addEventListener('resize', () => {
        clearTimeout(window._mobileLayoutTimer);
        window._mobileLayoutTimer = setTimeout(updateForMobileLayout, 150);
    });

    function touchIconStart(e) {
        if (!e.touches || e.touches.length > 1) return;
        const icon = e.target.closest('.icon');
        if (!icon) return;

        touchInitialX = e.touches[0].clientX;
        touchInitialY = e.touches[0].clientY;

        if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }

        touchTimer = setTimeout(() => {
            touchTimer = null;
            try { dragStart(e); } catch (err) { console.error(err); }
        }, TOUCH_LONGPRESS_MS);
    }

    function touchIconMove(e) {
        if (!touchTimer || !e.touches || e.touches.length > 1) return;
        const moveX = e.touches[0].clientX;
        const moveY = e.touches[0].clientY;
        if (Math.abs(moveX - touchInitialX) > TOUCH_MOVE_THRESHOLD || Math.abs(moveY - touchInitialY) > TOUCH_MOVE_THRESHOLD) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
    }

    function touchIconEnd(e) {
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
    }

    function startWindowDrag(e) {
        const windowHeader = e.target.closest('.window-header');
        if (!windowHeader || (e.type === 'mousedown' && e.button !== 0)) return; 

        e.preventDefault();
        windowDragActive = true;
        
        activeWindow = windowHeader.closest('.app-window');
        if (!activeWindow) return;
        
        const coords = getClientCoords(e);
        windowInitialX = coords.x;
        windowInitialY = coords.y;
        
        windowOffsetX = coords.x - activeWindow.getBoundingClientRect().left;
        windowOffsetY = coords.y - activeWindow.getBoundingClientRect().top;

        document.addEventListener('mousemove', dragWindow);
        document.addEventListener('mouseup', endWindowDrag);
        document.addEventListener('touchmove', dragWindow, { passive: false });
        document.addEventListener('touchend', endWindowDrag);

        activeWindow.style.transition = 'none'; 
    }

    function dragWindow(e) {
        if (!windowDragActive || !activeWindow) return;

        e.preventDefault();
        const coords = getClientCoords(e);

        let newX = coords.x - windowOffsetX;
        let newY = coords.y - windowOffsetY;

        activeWindow.style.left = newX + 'px';
        activeWindow.style.top = newY + 'px';
        activeWindow.style.transform = 'none'; 
    }

    function endWindowDrag() {
        if (!windowDragActive) return;

        windowDragActive = false;
        if (activeWindow) {
            activeWindow.style.transition = ''; 
            activeWindow = null;
        }

        document.removeEventListener('mousemove', dragWindow);
        document.removeEventListener('mouseup', endWindowDrag);
        document.removeEventListener('touchmove', dragWindow);
        document.removeEventListener('touchend', endWindowDrag);
    }
    
    function closeWindow(windowElement) {
        windowElement.style.display = 'none';
    }
    
    if (folderWindow) {
        const header = folderWindow.querySelector('.window-header');
        if (header) {
            header.addEventListener('mousedown', startWindowDrag);

            let headerTouchTimer = null;
            let headerStartX = 0;
            let headerStartY = 0;

            function headerTouchStart(e) {
                if (!e.touches || e.touches.length > 1) return;
                headerStartX = e.touches[0].clientX;
                headerStartY = e.touches[0].clientY;
                if (headerTouchTimer) { clearTimeout(headerTouchTimer); headerTouchTimer = null; }
                headerTouchTimer = setTimeout(() => {
                    headerTouchTimer = null;
                    startWindowDrag(e);
                }, TOUCH_LONGPRESS_MS);
            }

            function headerTouchMove(e) {
                if (!headerTouchTimer || !e.touches || e.touches.length > 1) return;
                const mx = e.touches[0].clientX;
                const my = e.touches[0].clientY;
                if (Math.abs(mx - headerStartX) > TOUCH_MOVE_THRESHOLD || Math.abs(my - headerStartY) > TOUCH_MOVE_THRESHOLD) {
                    clearTimeout(headerTouchTimer);
                    headerTouchTimer = null;
                }
            }

            function headerTouchEnd(e) {
                if (headerTouchTimer) { clearTimeout(headerTouchTimer); headerTouchTimer = null; }
            }

            header.addEventListener('touchstart', headerTouchStart, { passive: false });
            header.addEventListener('touchmove', headerTouchMove, { passive: false });
            header.addEventListener('touchend', headerTouchEnd);
        }
        folderWindow.querySelector('.close-btn').addEventListener('click', () => closeWindow(folderWindow));
    }

    if (promoWindow) {
        const header = promoWindow.querySelector('.window-header');
        if (header) {
            header.addEventListener('mousedown', startWindowDrag);

            let headerTouchTimer = null;
            let headerStartX = 0;
            let headerStartY = 0;

            function headerTouchStart(e) {
                if (!e.touches || e.touches.length > 1) return;
                headerStartX = e.touches[0].clientX;
                headerStartY = e.touches[0].clientY;
                if (headerTouchTimer) { clearTimeout(headerTouchTimer); headerTouchTimer = null; }
                headerTouchTimer = setTimeout(() => {
                    headerTouchTimer = null;
                    startWindowDrag(e);
                }, TOUCH_LONGPRESS_MS);
            }

            function headerTouchMove(e) {
                if (!headerTouchTimer || !e.touches || e.touches.length > 1) return;
                const mx = e.touches[0].clientX;
                const my = e.touches[0].clientY;
                if (Math.abs(mx - headerStartX) > TOUCH_MOVE_THRESHOLD || Math.abs(my - headerStartY) > TOUCH_MOVE_THRESHOLD) {
                    clearTimeout(headerTouchTimer);
                    headerTouchTimer = null;
                }
            }

            function headerTouchEnd(e) {
                if (headerTouchTimer) { clearTimeout(headerTouchTimer); headerTouchTimer = null; }
            }

            header.addEventListener('touchstart', headerTouchStart, { passive: false });
            header.addEventListener('touchmove', headerTouchMove, { passive: false });
            header.addEventListener('touchend', headerTouchEnd);
        }
        promoWindow.querySelector('.close-btn').addEventListener('click', () => closeWindow(promoWindow));
    }

    function applyZoom() {
        lightboxImage.style.transform = `scale(${currentZoom / 100})`;
        zoomLevelSpan.textContent = `${currentZoom}%`;
        
        zoomOutBtn.disabled = (currentZoom <= ZOOM_STEP);
        zoomInBtn.disabled = (currentZoom >= 200);
    }

    function zoom(direction) {
        const newZoom = currentZoom + (direction * ZOOM_STEP);
        if (newZoom >= ZOOM_STEP && newZoom <= 200) {
            currentZoom = newZoom;
            applyZoom();
        }
    }

    function navigate(direction) {
        const imageSet = currentImageSet === 'promo' ? promoImages : coverImages;
        
        if (imageSet.length === 0) return;
        
        let newIndex = currentImageIndex + direction;
        
        if (newIndex < 0) {
            newIndex = imageSet.length - 1;
        } else if (newIndex >= imageSet.length) {
            newIndex = 0;
        }

        if (newIndex >= 0 && newIndex < imageSet.length) {
            currentImageIndex = newIndex;
            const newImageSrc = imageSet[currentImageIndex].src;
            lightboxImage.src = newImageSrc;
            
            currentZoom = 100;
            applyZoom();
        }
    }

    function showLightbox(imageElement, index, imageSetType = 'cover') {
        currentImageIndex = index;
        currentImageSet = imageSetType;
        currentZoom = 100;
        
        lightboxImage.src = imageElement.src;
        applyZoom();
        
        lightbox.classList.remove('hidden');
    }
    
    coverImages = Array.from(document.querySelectorAll('#folder-window .cover-img'));
    promoImages = Array.from(document.querySelectorAll('#promo-window .promo-img'));
    
    coverImages.forEach((img, index) => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            showLightbox(img, index, 'cover');
        });
    });

    promoImages.forEach((img, index) => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            showLightbox(img, index, 'promo');
        });
    });

    if (zoomInBtn && zoomOutBtn) {
        zoomInBtn.addEventListener('click', () => zoom(1));
        zoomOutBtn.addEventListener('click', () => zoom(-1));
    }
    
    if (navPrevBtn && navNextBtn) {
        navPrevBtn.addEventListener('click', (e) => { 
            e.stopPropagation();
            navigate(-1); 
        });
        navNextBtn.addEventListener('click', (e) => { 
            e.stopPropagation();
            navigate(1); 
        });
    }

    lightbox.addEventListener('click', (e) => {
        if (e.target.id === 'lightbox') {
            lightbox.classList.add('hidden');
            setTimeout(() => {
                lightboxImage.src = ''; 
                lightboxImage.style.transform = 'none';
            }, 300);
        }
    });

    icons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            if (isDragging) {
                isDragging = false; 
                return; 
            }
            
            const label = icon.dataset.label;
            const url = iconLinks[label];

            if (label === 'WHO_ARE_YOU_? mxtp_shoot') {
                folderWindow.style.display = 'flex';
                folderWindow.style.zIndex = 1001; 
                
                const windowRect = folderWindow.getBoundingClientRect();
                if (windowRect.top < 0 || windowRect.left < 0 || windowRect.bottom > desktop.clientHeight || windowRect.right > desktop.clientWidth) {
                    folderWindow.style.top = '50%';
                    folderWindow.style.left = '50%';
                    folderWindow.style.transform = 'translate(-50%, -50%)';
                }

            } else if (label === '???') {
                promoWindow.style.display = 'flex';
                promoWindow.style.zIndex = 1001; 
                
                const windowRect = promoWindow.getBoundingClientRect();
                if (windowRect.top < 0 || windowRect.left < 0 || windowRect.bottom > desktop.clientHeight || windowRect.right > desktop.clientWidth) {
                    promoWindow.style.top = '50%';
                    promoWindow.style.left = '50%';
                    promoWindow.style.transform = 'translate(-50%, -50%)';
                }

            } else if (url) {
                window.open(url, '_blank');
            } else {
                console.log(`Attempting to open generic folder/app: ${label}`);
            }
        });

        icon.addEventListener('dblclick', (e) => {
             e.preventDefault();
        });
    });
    
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
// New position for anti-right-click logic, ensuring it loads before DOMContentLoaded.
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    console.log("Right-click disabled to protect content.");
});

document.addEventListener('DOMContentLoaded', () => {
    const desktop = document.getElementById('desktop');
    // Select the toggle using its shared class
    const toggles = document.querySelectorAll('.mode-toggle'); 

    // Define the links for the specific application icons
    const iconLinks = {
        'Spotify': 'https://open.spotify.com/artist/5JD93roKnQecDffPmlzF0Q?si=IxrFkZrRS36iwbRP3bYvBQ',
        'Apple Music': 'https://music.apple.com/ca/artist/aluoma/1790001361',
        'App 1': 'https://tidal.com/artist/53250905'
    };
    
    
    // --- Dark/Light Mode Core Logic ---
    function switchMode(newMode) {
        // 1. Update the desktop class (The source of truth)
        desktop.className = '';
        desktop.classList.add(newMode);
        // *** UPDATED: Using 'currentMode' key for consistency ***
        localStorage.setItem('currentMode', newMode); 
        // The CSS handles the visual update of the toggles based on desktop class
    }
    
    function applySavedMode() {
        // *** UPDATED: Reading 'currentMode' key for consistency ***
        const savedMode = localStorage.getItem('currentMode') || 'light-mode';
        switchMode(savedMode);
    }

    // Apply saved mode on load
    applySavedMode();
    
    // Add click listeners to the remaining toggle
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            if (desktop.classList.contains('light-mode')) {
                switchMode('dark-mode');
            } else {
                switchMode('light-mode');
            }
        });
    });

    // --- Icon Double-Click Logic ---
    document.querySelectorAll('.icon').forEach(icon => {
        icon.addEventListener('dblclick', () => {
            const label = icon.dataset.label;
            const url = iconLinks[label];

            if (label === 'WHO_ARE_YOU_? mxtp_shoot') {
                // Opens the folder-explorer.html in a new window
                window.open(
                    'folder-explorer.html', 
                    'FolderWindow', 
                    'width=700,height=500,scrollbars=yes,resizable=yes'
                );
            } else if (url) {
                // Open app links in a new tab
                window.open(url, '_blank');
            } else {
                // For other folders (like '???')
                console.log(`Attempting to open folder: ${label}`);
            }
        });
    });
});
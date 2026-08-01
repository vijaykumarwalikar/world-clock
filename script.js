// Core state and global states
let activeCities = [];
let is24Hour = true; 
let currentFocus = -1; 

// Automatized generation of master time zone list
function getFullMasterCityList() {
    const rawTimeZones = Intl.supportedValuesOf('timeZone');
    return rawTimeZones.map(zoneName => {
        const stringParts = zoneName.split('/');
        let cleanName = stringParts[stringParts.length - 1].replace(/_/g, ' ');

        // Global timezone name corrections
        const globalCorrections = {
            "Calcutta": "Kolkata",
            "Bombay": "Mumbai",
            "Madras": "Chennai",
            "Saigon": "Ho Chi Minh City",
            "Katmandu": "Kathmandu",
            "Kiev": "Kyiv",
            "Truk": "Chuuk",
            "Ponape": "Pohnpei"
        };

        // If the current city name exists in our dictionary, apply the clean modern name
        if (globalCorrections[cleanName]) {
            cleanName = globalCorrections[cleanName];
        }

        if (stringParts.length > 2) {
            cleanName = `${stringParts[1]} - ${cleanName}`;
        }
        return {
            id: zoneName,           // Technical key remains solid (e.g., "Asia/Saigon")
            name: cleanName,        // Normalized cross-browser display name (e.g., "Ho Chi Minh City")
            timeZone: zoneName,     
            label: zoneName.split('/')[0] 
        };
    });
}
const masterCityList = getFullMasterCityList();

// Load prevoius settings and save new settings 
function loadState() {
    const savedCities = localStorage.getItem('worldClocksState');
    if (savedCities) {
        activeCities = JSON.parse(savedCities);
    } else {
        activeCities = [
            { id: "Europe/London", name: "London", timeZone: "Europe/London", label: "Europe" },
            { id: "Asia/Tokyo", name: "Tokyo", timeZone: "Asia/Tokyo", label: "Asia" }
        ];
    }

    const savedFormatSetting = localStorage.getItem('worldClocksFormatSetting');
    if (savedFormatSetting !== null) {
        is24Hour = JSON.parse(savedFormatSetting);
    }
}

function saveState() {
    try {
        localStorage.setItem('worldClocksState', JSON.stringify(activeCities));
        localStorage.setItem('worldClocksFormatSetting', JSON.stringify(is24Hour));
    } catch (e) {
        console.error("Failed to save layout state parameters to LocalStorage:", e);
    }
}

// DOM Access Anchors
const gridContainer = document.getElementById('world-clocks-container');
const searchInput = document.getElementById('city-search-input');
const resultsList = document.getElementById('search-results-list');
const formatToggleBtn = document.getElementById('format-toggle-btn');

// Real-time search engine and list rendering
function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    currentFocus = -1;

    if (query === "") {
        resultsList.innerHTML = "";
        resultsList.style.display = "none";
        return;
    }

    const matchingCities = masterCityList.filter(city => 
        city.name.toLowerCase().includes(query) || 
        city.label.toLowerCase().includes(query)
    );

    if (matchingCities.length > 0) {
        let listHTML = '';
        matchingCities.forEach(city => {
            listHTML += `
                <div class="search-item" data-id="${city.id}">
                    (${city.label}) ${city.name}
                </div>
            `;
        });
        resultsList.innerHTML = listHTML;
        resultsList.style.display = "block"; 
    } else {
        resultsList.innerHTML = `<div class="search-item" style="cursor: default; color: #000000;">No matching places found</div>`;
        resultsList.style.display = "block";
    }
}

// Selecting an item from search results panel
resultsList.addEventListener('click', (event) => {
    const targetItem = event.target.closest('.search-item');
    if (!targetItem || !targetItem.hasAttribute('data-id')) return;

    const selectedId = targetItem.getAttribute('data-id');
    addCityById(selectedId);
});

function addCityById(cityId) {
    const selectedCityObj = masterCityList.find(city => city.id === cityId);
    
    if (selectedCityObj) {
        const alreadyExists = activeCities.some(city => city.id === cityId);
        
        if (!alreadyExists) {
            activeCities.push(selectedCityObj);
            saveState();
            renderClockCards();
            updateClocks();
            
            searchInput.value = "";
            resultsList.innerHTML = "";
            resultsList.style.display = "none";
            currentFocus = -1; 
        } else {
            alert("This location is already visible on your dashboard views.");
        }
    }
}

// Render active clock cards to grid
function renderClockCards() {
    let folderHTML = '';
    activeCities.forEach((city) => {
        const safeId = city.id.replace(/\//g, '-');
        folderHTML += `
            <div class="clock-card">
                <button class="delete-btn" onclick="removeCity('${city.id}')">&times;</button>
                <h3>${city.name}</h3>
                <div class="clock" id="clock-${safeId}" data-zone="${city.timeZone}">00:00:00</div>
                <div class="timezone-label">${city.label}</div>
                <div class="offset-badge" id="offset-${safeId}">0.0 hrs</div>
            </div>
        `;
    });
    gridContainer.innerHTML = folderHTML;
}

// Calculate time offset and update clocks
function calculateTimeOffset(targetTimeZone) {
    const now = new Date();
    const formatterOptions = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false };
    
    const localParts = new Intl.DateTimeFormat('en-US', formatterOptions).format(now);
    const targetParts = new Intl.DateTimeFormat('en-US', { ...formatterOptions, timeZone: targetTimeZone }).format(now);

    const d1 = new Date(localParts);
    const d2 = new Date(targetParts);

    return (d2 - d1) / (1000 * 60 * 60);
}

function updateClocks() {
    const now = new Date();

    const localTimeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !is24Hour };
    const localDateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    document.getElementById('local-clock').innerText = now.toLocaleTimeString([], localTimeOptions);
    document.getElementById('local-date').innerText = now.toLocaleDateString([], localDateOptions);

    activeCities.forEach((city) => {
        const safeId = city.id.replace(/\//g, '-');
        const clockElement = document.getElementById(`clock-${safeId}`);
        const offsetElement = document.getElementById(`offset-${safeId}`);
        
        if (clockElement) {
            const options = { timeZone: city.timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !is24Hour };
            clockElement.innerText = now.toLocaleTimeString([], options);
        }

        if (offsetElement) {
            const hoursDifference = calculateTimeOffset(city.timeZone);
            if (hoursDifference > 0) {
                offsetElement.innerText = `+${hoursDifference} hrs ahead`;
                offsetElement.className = "offset-badge offset-ahead";
            } else if (hoursDifference < 0) {
                offsetElement.innerText = `${hoursDifference} hrs behind`;
                offsetElement.className = "offset-badge offset-behind";
            } else {
                offsetElement.innerText = "Same time as local";
                offsetElement.className = "offset-badge offset-same";
            }
        }
    });
}

// Action - Keyboard & click interactions
function handleKeyboardNavigation(event) {
    let items = resultsList.getElementsByClassName("search-item");
    if (items.length === 0 || items[0].style.cursor === 'default') return;

    if (event.key === "ArrowDown") {
        event.preventDefault(); 
        currentFocus++;
        addActiveHighlight(items);
    } else if (event.key === "ArrowUp") {
        event.preventDefault(); 
        currentFocus--;
        addActiveHighlight(items);
    } else if (event.key === "Enter") {
        event.preventDefault();
        if (currentFocus > -1 && items[currentFocus]) {
            items[currentFocus].click(); 
        }
    }
}

function addActiveHighlight(itemsList) {
    if (!itemsList) return;
    removeActiveHighlight(itemsList);
    
    if (currentFocus >= itemsList.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = itemsList.length - 1;
    
    itemsList[currentFocus].classList.add("search-item-active");
    
    const activeItem = itemsList[currentFocus];
    if (activeItem.offsetTop + activeItem.clientHeight > resultsList.scrollTop + resultsList.clientHeight) {
        resultsList.scrollTop = activeItem.offsetTop - resultsList.clientHeight + activeItem.clientHeight;
    } else if (activeItem.offsetTop < resultsList.scrollTop) {
        resultsList.scrollTop = activeItem.offsetTop;
    }
}

function removeActiveHighlight(itemsList) {
    for (let i = 0; i < itemsList.length; i++) {
        itemsList[i].classList.remove("search-item-active");
    }
}

function handleFormatToggle() {
    is24Hour = !is24Hour; 
    saveState();          
    
    if (is24Hour) {
        formatToggleBtn.innerText = "24h";
    } else {
        formatToggleBtn.innerText = "12h";
    }
    updateClocks(); 
}

function removeCity(idToRemove) {
    activeCities = activeCities.filter(city => city.id !== idToRemove);
    saveState();
    renderClockCards();
    updateClocks();
}

document.addEventListener('click', (event) => {
    if (!event.target.closest('.searchable-dropdown')) {
        resultsList.style.display = "none";
    }
});

// Event Listeners Wire-up
searchInput.addEventListener('input', handleSearch);
searchInput.addEventListener('keydown', handleKeyboardNavigation); 
formatToggleBtn.addEventListener('click', handleFormatToggle); 

// Execution pipeline
loadState();

if (is24Hour) {
    formatToggleBtn.innerText = "24h";
} else {
    formatToggleBtn.innerText = "12h";
}

renderClockCards();
updateClocks();
setInterval(updateClocks, 1000);
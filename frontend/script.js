const API_BASE = 'http://localhost:5000/api';

let selectedFromCode = null;
let selectedToCode = null;
let selectedSingleCode = null;
let favorites = [];
let map = null;
let mapInitialized = false;

$(document).ready(function() {
    favorites = loadFavorites();
    initTabs();
    initSearchAutocomplete();
    loadPopularStations();
    renderFavorites();
    
    $('#search-between').click(searchBetweenStations);
    $('#search-station').click(searchStationSchedule);
});

function initTabs() {
    $('.tab-btn').click(function() {
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        
        const tab = $(this).data('tab');
        $('.tab-content').removeClass('active');
        
        if (tab === 'between') $('#between-tab').addClass('active');
        else if (tab === 'station') $('#station-tab').addClass('active');
        else if (tab === 'favorites') {
            $('#favorites-tab').addClass('active');
            renderFavorites();
        }
        else if (tab === 'map') {
            $('#map-tab').addClass('active');
            if (!mapInitialized) {
                initMap();
            } else if (map) {
                map.container.fitToViewport();
            }
        }
    });
}

function initSearchAutocomplete() {
    const fields = [
        { input: '#from-station', suggestions: '#from-suggestions', setCode: (code) => selectedFromCode = code },
        { input: '#to-station', suggestions: '#to-suggestions', setCode: (code) => selectedToCode = code },
        { input: '#single-station', suggestions: '#single-suggestions', setCode: (code) => selectedSingleCode = code }
    ];
    
    fields.forEach(field => {
        let debounceTimer;
        
        $(field.input).on('input', function() {
            clearTimeout(debounceTimer);
            const query = $(this).val();
            
            if (query.length < 2) {
                $(field.suggestions).hide();
                return;
            }
            
            debounceTimer = setTimeout(() => {
                $.get(`${API_BASE}/stations/search?query=${encodeURIComponent(query)}`, function(data) {
                    $(field.suggestions).empty().show();
                    
                    data.forEach(station => {
                        const item = $(`<div class="suggestion-item">
                            <div class="station-name">${station.title}</div>
                            <div class="station-loc">${station.settlement}</div>
                        </div>`);
                        
                        item.click(function() {
                            $(field.input).val(station.title);
                            field.setCode(station.code);
                            $(field.suggestions).hide();
                        });
                        
                        $(field.suggestions).append(item);
                    });
                });
            }, 300);
        });
                
        $(document).click(function(e) {
            if (!$(e.target).closest(field.input).length) {
                $(field.suggestions).hide();
            }
        });
    });
}

function searchBetweenStations() {
    if (!selectedFromCode || !selectedToCode) {
        alert('Пожалуйста, выберите обе станции из выпадающего списка');
        return;
    }
    
    showLoader();
    
    $.get(`${API_BASE}/between?from=${selectedFromCode}&to=${selectedToCode}`)
        .done(function(data) {
            renderSchedule(data);
        })
        .fail(function(error) {
            $('#schedule-list').html('<div class="error">Ошибка загрузки расписания. Проверьте подключение к серверу.</div>');
        })
        .always(function() {
            hideLoader();
        });
}

function searchStationSchedule() {
    if (!selectedSingleCode) {
        alert('Пожалуйста, выберите станцию из выпадающего списка');
        return;
    }
    
    showLoader();
    
    $.get(`${API_BASE}/schedule?station_code=${selectedSingleCode}`)
        .done(function(data) {
            renderSchedule(data);
        })
        .fail(function(error) {
            $('#schedule-list').html('<div class="error">Ошибка загрузки расписания</div>');
        })
        .always(function() {
            hideLoader();
        });
}

function loadPopularStations() {
    $.get(`${API_BASE}/popular`, function(stations) {
        const container = $('#popular-stations');
        container.empty();
        
        stations.forEach(station => {
            const item = $(`<div class="popular-item">${station.title}</div>`);
            item.click(function() {
                $('#single-station').val(station.title);
                selectedSingleCode = station.code;
                searchStationSchedule();
            });
            container.append(item);
        });
    });
}

function renderSchedule(data) {
    const container = $('#schedule-list');
    
    let scheduleList = [];    
    
    if (data && data.schedule && Array.isArray(data.schedule)) {
        scheduleList = data.schedule;
    }   
    else if (data && data.segments && Array.isArray(data.segments)) {
        scheduleList = data.segments;
    }    
    else if (data && Array.isArray(data)) {
        scheduleList = data;
    }
    else {
        container.html('<div class="empty-message">Нет поездов по данному маршруту</div>');
        $('#results-count').text('');
        return;
    }
    
    if (scheduleList.length === 0) {
        container.html('<div class="empty-message">Нет поездов по данному маршруту</div>');
        $('#results-count').text('');
        return;
    }
    
    $('#results-count').text(`${scheduleList.length} поезд(ов)`);
    container.empty();
    
    scheduleList.forEach((item) => {        
        if (item.departure && item.arrival && item.from && item.to) {
            const trainNumber = item.thread?.number || '---';
            const fromStation = item.from?.title || '---';
            const toStation = item.to?.title || '---';
            const departureTime = item.departure ? item.departure.substring(0, 5) : '---';
            const arrivalTime = item.arrival ? item.arrival.substring(0, 5) : '---';
            
            const stationCode = item.from?.code || '---';
            const stationTitle = fromStation;
            const isFav = isFavorite(stationCode);
            
            const trainCard = renderTrainCardBetween(trainNumber, fromStation, toStation, departureTime, arrivalTime, stationCode, stationTitle, isFav);
            
            attachFavoriteHandler(trainCard, stationCode, stationTitle);
            container.append(trainCard);
        }        
        else if (item.thread) {
            const trainTitle = item.thread.title || 'Электричка';
            const trainNumber = item.thread.number ? `№${item.thread.number}` : '';
            
            let fromStation = '---';
            let toStation = '---';
            
            if (trainTitle && trainTitle.includes(' — ')) {
                const parts = trainTitle.split(' — ');
                fromStation = parts[0] || '---';
                toStation = parts[1] || '---';
            }
            
            const departureTime = item.departure ? item.departure.substring(0, 5) : '---';
            const arrivalTime = item.arrival ? item.arrival.substring(0, 5) : '---';
            
            let stationCode = selectedSingleCode || fromStation;
            let stationTitle = fromStation !== '---' ? fromStation : trainTitle.split(' — ')[0];
            
            const isFav = isFavorite(stationCode);
            
            const trainCard = renderTrainCardStation(trainTitle, trainNumber, fromStation, toStation, departureTime, arrivalTime, stationCode, stationTitle, isFav, item.days);
            
            attachFavoriteHandler(trainCard, stationCode, stationTitle);
            container.append(trainCard);
        }
    });
}

function attachFavoriteHandler(card, code, title) {
    card.find('.favorite-btn').click(function(e) {
        e.stopPropagation();
        toggleFavorite(code, title);
        $(this).toggleClass('active');
        const icon = $(this).find('i');
        const span = $(this).find('span');
        
        const isNowFavorite = isFavorite(code);
        if (isNowFavorite) {
            icon.removeClass('fa-heart-o').addClass('fa-heart');
            span.text('В избранном');
        } else {
            icon.removeClass('fa-heart').addClass('fa-heart-o');
            span.text('В избранное');
        }
    });
}

function isLocalStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch(e) {
        return false;
    }
}

function loadFavorites() {
    if (!isLocalStorageAvailable()) return [];
    const saved = localStorage.getItem('favoriteStations');
    return saved ? JSON.parse(saved) : [];
}

function saveFavorites() {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem('favoriteStations', JSON.stringify(favorites));
}

function toggleFavorite(stationCode, stationTitle) {
    const index = favorites.findIndex(f => f.code === stationCode);
    
    if (index === -1) {
        favorites.push({ code: stationCode, title: stationTitle });
        showMessage(`✅ ${stationTitle} добавлена в избранное`);
    } else {
        favorites.splice(index, 1);
        showMessage(`❌ ${stationTitle} удалена из избранного`);
    }
    
    saveFavorites();
    renderFavorites();
}

function isFavorite(stationCode) {
    return favorites.some(f => f.code === stationCode);
}

function renderFavorites() {
    const container = $('#favorites-list');
    
    if (favorites.length === 0) {
        container.html('<p class="empty-message">⭐ Нет избранных станций. Нажмите на сердечко в расписании!</p>');
        return;
    }
    
    container.empty();
    favorites.forEach(fav => {
        const card = $(`
            <div class="favorite-station-card" data-code="${fav.code}">
                <div class="favorite-station-info">
                    <h4><i class="fas fa-train"></i> ${fav.title}</h4>
                    <p>Нажмите, чтобы посмотреть расписание</p>
                </div>
                <button class="remove-favorite" data-code="${fav.code}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `);
        
        card.click(function(e) {
            if (!$(e.target).closest('.remove-favorite').length) {
                selectedSingleCode = fav.code;
                $('#single-station').val(fav.title);
                $('.tab-btn[data-tab="station"]').click();
                searchStationSchedule();
            }
        });
        
        card.find('.remove-favorite').click(function(e) {
            e.stopPropagation();
            toggleFavorite(fav.code, fav.title);
        });
        
        container.append(card);
    });
}

function showMessage(text) {
    let toast = $('#toast-message');
    if (toast.length === 0) {
        $('body').append('<div id="toast-message" style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#1a1a2e; color:white; padding:12px 20px; border-radius:30px; font-size:14px; z-index:1000; display:none; white-space:nowrap; box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>');
        toast = $('#toast-message');
    }
    
    toast.text(text).fadeIn(200);
    setTimeout(() => {
        toast.fadeOut(500);
    }, 2000);
}

function showLoader() {
    $('#schedule-list').html('<div class="loader"><i class="fas fa-spinner"></i> Загрузка расписания...</div>');
}

function hideLoader() {
    
}


function initMap() {
    if (map !== null) return;
    
    if (typeof ymaps === 'undefined') {
        console.log('Ожидание загрузки Яндекс.Карт...');
        setTimeout(initMap, 200);
        return;
    }
    
    ymaps.ready(function() {
        map = new ymaps.Map('map', {
            center: [55.751574, 37.573856],
            zoom: 9,
            controls: ['zoomControl', 'fullscreenControl']
        });
        mapInitialized = true;
        loadStationsOnMap();
    });
}

function loadStationsOnMap() {
    if (!map || typeof STATIONS_COORDS === 'undefined') return;
    
    STATIONS_COORDS.forEach(station => {
        const placemark = new ymaps.Placemark([station.lat, station.lon], {
            hintContent: station.name,
            balloonContent: `
                <div style="padding: 10px;">
                    <strong>${station.name}</strong><br>
                    <button onclick="selectStationByCode('${station.code}', '${station.name}')" 
                            style="margin-top: 10px; background: #1a1a2e; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer;">
                        Показать расписание
                    </button>
                </div>
            `
        }, {
            preset: 'islands#blueRailwayIcon',
            iconColor: '#1a1a2e'
        });
        
        placemark.events.add('click', function() {
            selectStationByCode(station.code, station.name);
        });
        
        map.geoObjects.add(placemark);
    });
    
    showMessage(`📍 На карте отмечено ${STATIONS_COORDS.length} станций. Нажмите на маркер!`);
}

function selectStationByCode(code, name) {
    selectedSingleCode = code;
    $('#single-station').val(name);
    $('.tab-btn[data-tab="station"]').click();
    setTimeout(() => {
        searchStationSchedule();
    }, 100);
}
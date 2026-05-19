// script.js - Главный файл инициализации

const API_BASE = 'http://localhost:5000/api';

let selectedFromCode = null;
let selectedToCode = null;
let selectedSingleCode = null;

$(document).ready(function() {
    favorites = loadFavorites();
    initTabs();
    initSearchAutocomplete();
    loadPopularStations();
    renderFavorites();
    
    $('#search-between').click(searchBetweenStations);
    $('#search-station').click(searchStationSchedule);
    $(window).on('beforeunload', function() {
        cleanupMapTimer();
        destroyMap();
    });
});

function initTabs() {
    $('.tab-btn').click(function() {
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        
        const tab = $(this).data('tab');
        $('.tab-content').removeClass('active');
        
        if (tab === 'between') {
            $('#between-tab').addClass('active');
            cleanupMapTimer(); 
        }
        else if (tab === 'station') {
            $('#station-tab').addClass('active');
            cleanupMapTimer();
        }
        else if (tab === 'favorites') {
            $('#favorites-tab').addClass('active');
            renderFavorites();
            cleanupMapTimer();
        }
        else if (tab === 'map') {
            $('#map-tab').addClass('active');
            cleanupMapTimer(); 
            
            if (!mapInitialized) {
                initMap();
            } else if (map) {
                setTimeout(() => {
                    map.container.fitToViewport();
                }, 100);
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
            const isFav = favoritesManager.isFavorite(stationCode);
            
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
            
            const isFav = favoritesManager.isFavorite(stationCode);
            
            const trainCard = renderTrainCardStation(trainTitle, trainNumber, fromStation, toStation, departureTime, arrivalTime, stationCode, stationTitle, isFav, item.days);
            
            attachFavoriteHandler(trainCard, stationCode, stationTitle);
            container.append(trainCard);
        }
    });
}

function attachFavoriteHandler(card, code, title) {
    card.find('.favorite-btn').click(function(e) {
        e.stopPropagation();
        const result = favoritesManager.toggle(code, title);
        
        $(this).toggleClass('active');
        const icon = $(this).find('i');
        const span = $(this).find('span');
        
        const isNowFavorite = favoritesManager.isFavorite(code);
        if (isNowFavorite) {
            icon.removeClass('fa-heart-o').addClass('fa-heart');
            span.text('В избранном');
            showMessage(`✅ ${title} добавлена в избранное`, 'success');
        } else {
            icon.removeClass('fa-heart').addClass('fa-heart-o');
            span.text('В избранное');
            showMessage(`❌ ${title} удалена из избранного`, 'error');
        }
        
        renderFavorites();
    });
}

function loadFavorites() {
    const saved = localStorage.getItem('favoriteStations');
    return saved ? JSON.parse(saved) : [];
}

function saveFavorites() {
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
    if (mapInitTimer) {
        clearTimeout(mapInitTimer);
        mapInitTimer = null;
    }
    
    if (map !== null) {
        return;
    }
    
    if (typeof ymaps === 'undefined') {
        mapInitAttempts++;
        
        if (mapInitAttempts >= MAX_MAP_INIT_ATTEMPTS) {
            console.error('Не удалось загрузить Яндекс.Карты');
            showMessage('❌ Не удалось загрузить карту. Проверьте подключение к интернету.');
            mapInitAttempts = 0;
            return;
        }
        
        console.log(`Ожидание загрузки Яндекс.Карт... (попытка ${mapInitAttempts}/${MAX_MAP_INIT_ATTEMPTS})`);
        
        mapInitTimer = setTimeout(initMap, 200);
        return;
    }
   
    ymaps.ready(function() {
        if (map !== null) {
            return;
        }
        
        try {
            map = new ymaps.Map('map', {
                center: [55.751574, 37.573856],
                zoom: 9,
                controls: ['zoomControl', 'fullscreenControl']
            });
            mapInitialized = true;
            loadStationsOnMap();
            showMessage(`📍 На карте отмечено ${STATIONS_COORDS.length} станций`);
        } catch (error) {
            console.error('Ошибка при создании карты:', error);
            showMessage('❌ Ошибка при загрузке карты');
        }
    });
}

function cleanupMapTimer() {
    if (mapInitTimer) {
        clearTimeout(mapInitTimer);
        mapInitTimer = null;
    }
    mapInitAttempts = 0;
}

function destroyMap() {
    cleanupMapTimer();
    
    if (map !== null) {
        try {
            map.destroy();
        } catch (error) {
            console.error('Ошибка при уничтожении карты:', error);
        }
        map = null;
        mapInitialized = false;
    }
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
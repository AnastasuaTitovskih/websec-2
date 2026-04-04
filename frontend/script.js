const API_BASE = 'http://localhost:5000/api';

let selectedFromCode = null;
let selectedToCode = null;
let selectedSingleCode = null;
let favorites = [];

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
            console.log("Данные от API (станция):", data);
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
            
            const trainCard = $(`
                <div class="train-card">
                    <div class="train-header">
                        <span class="train-number">Электричка №${trainNumber}</span>
                        <button class="favorite-btn ${isFav ? 'active' : ''}" data-code="${stationCode}" data-title="${stationTitle}">
                            <i class="fas ${isFav ? 'fa-heart' : 'fa-heart-o'}"></i>
                        </button>
                    </div>
                    <div class="train-route">${fromStation} → ${toStation}</div>
                    <div class="train-time">
                        <div class="departure">
                            <div class="time">${departureTime}</div>
                            <div class="station">${fromStation}</div>
                        </div>
                        <div class="arrival">
                            <div class="time">${arrivalTime}</div>
                            <div class="station">${toStation}</div>
                        </div>
                    </div>
                </div>
            `);
            
            trainCard.find('.favorite-btn').click(function(e) {
                e.stopPropagation();
                const code = $(this).data('code');
                const title = $(this).data('title');
                toggleFavorite(code, title);
                $(this).toggleClass('active');
                const icon = $(this).find('i');
                if (icon.hasClass('fa-heart-o')) {
                    icon.removeClass('fa-heart-o').addClass('fa-heart');
                } else {
                    icon.removeClass('fa-heart').addClass('fa-heart-o');
                }
            });
            
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
            console.log('Создаём кнопку избранного:', { stationCode, stationTitle, isFav });
            const trainCard = $(`
                <div class="train-card">
                    <div class="train-header">
                        <span class="train-number">${trainTitle} ${trainNumber}</span>
                        <button class="favorite-btn ${isFav ? 'active' : ''}" data-code="${stationCode}" data-title="${stationTitle}" style="background:#f0f2f5; color:#ff4757; padding:4px 10px; border-radius:20px; font-size:13px; cursor:pointer; border:none; display:flex; align-items:center; gap:6px;">
                        <i class="fas ${isFav ? 'fa-heart' : 'fa-heart-o'}" style="font-size:14px;"></i>
                        <span style="font-size:12px; color:#666;">${isFav ? 'В избранном' : 'В избранное'}</span>
                        </button>
                    </div>
                    <div class="train-route">${fromStation} → ${toStation}</div>
                    <div class="train-time">
                        <div class="departure">
                            <div class="time">${departureTime}</div>
                            <div class="station">Отправление</div>
                        </div>
                        <div class="arrival">
                            <div class="time">${arrivalTime}</div>
                            <div class="station">Прибытие</div>
                        </div>
                    </div>
                    ${item.days ? `<div class="duration">📅 ${item.days}</div>` : ''}
                </div>
            `);
            
            trainCard.find('.favorite-btn').click(function(e) {
                e.stopPropagation();
                const code = $(this).data('code');
                const title = $(this).data('title');
                toggleFavorite(code, title);
                $(this).toggleClass('active');
                const icon = $(this).find('i');
                if (icon.hasClass('fa-heart-o')) {
                    icon.removeClass('fa-heart-o').addClass('fa-heart');
                } else {
                    icon.removeClass('fa-heart').addClass('fa-heart-o');
                }
            });
            
            container.append(trainCard);
        }
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
        $('body').append('<div id="toast-message" style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#1a1a2e; color:white; padding:12px 20px; border-radius:30px; font-size:14px; z-index:1000; display:none; white-space:nowrap;"></div>');
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
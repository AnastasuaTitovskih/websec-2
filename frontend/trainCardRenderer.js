function renderTrainCardBetween(trainNumber, fromStation, toStation, departureTime, arrivalTime, stationCode, stationTitle, isFav) {
    return $(`
        <div class="train-card">
            <div class="train-header">
                <span class="train-number">Электричка №${trainNumber}</span>
                <button class="favorite-btn ${isFav ? 'active' : ''}" data-code="${stationCode}" data-title="${stationTitle}" style="background:#f0f2f5; color:#ff4757; padding:4px 10px; border-radius:20px; font-size:13px; cursor:pointer; border:none; display:flex; align-items:center; gap:6px;">
                    <i class="fas ${isFav ? 'fa-heart' : 'fa-heart-o'}" style="font-size:14px;"></i>
                    <span style="font-size:12px; color:#666;">${isFav ? 'В избранном' : 'В избранное'}</span>
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
}

function renderTrainCardStation(trainTitle, trainNumber, fromStation, toStation, departureTime, arrivalTime, stationCode, stationTitle, isFav, days) {
    return $(`
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
            ${days ? `<div class="duration">📅 ${days}</div>` : ''}
        </div>
    `);
}
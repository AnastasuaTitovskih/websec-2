
function showMessage(text, type = 'info') {
    let toast = $('#toast-message');
    if (toast.length === 0) {
        $('body').append(`
            <div id="toast-message" style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#1a1a2e; color:white; padding:12px 20px; border-radius:30px; font-size:14px; z-index:1000; display:none; white-space:nowrap; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
            </div>
        `);
        toast = $('#toast-message');
    }

    const colors = {
        success: '#4caf50',
        error: '#f44336',
        info: '#1a1a2e'
    };
    
    toast.css('background', colors[type] || colors.info);
    toast.text(text).fadeIn(200);
    setTimeout(() => {
        toast.fadeOut(500);
    }, 2000);
}

function showLoader() {
    $('#schedule-list').html(`
        <div class="loader">
            <i class="fas fa-spinner fa-spin"></i> 
            Загрузка расписания...
        </div>
    `);
}

function hideLoader() {
    
}

function renderFavorites() {
    const container = $('#favorites-list');
    const favorites = favoritesManager.getAll();
    
    if (favorites.length === 0) {
        container.html('<p class="empty-message">⭐ Нет избранных станций. Нажмите на сердечко в расписании!</p>');
        return;
    }
    
    container.empty();
    favorites.forEach(fav => {
        const card = $(`
            <div class="favorite-station-card" data-code="${escapeHtml(fav.code)}">
                <div class="favorite-station-info">
                    <h4><i class="fas fa-train"></i> ${escapeHtml(fav.title)}</h4>
                    <p>Нажмите, чтобы посмотреть расписание</p>
                </div>
                <button class="remove-favorite" data-code="${escapeHtml(fav.code)}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `);
        
        card.click(function(e) {
            if (!$(e.target).closest('.remove-favorite').length) {
                selectStationFromFavorite(fav.code, fav.title);
            }
        });
        
        card.find('.remove-favorite').click(function(e) {
            e.stopPropagation();
            const result = favoritesManager.toggle(fav.code, fav.title);
            const message = result.action === 'added' 
                ? `✅ ${result.title} добавлена в избранное`
                : `❌ ${result.title} удалена из избранного`;
            showMessage(message, result.action === 'added' ? 'success' : 'error');
            renderFavorites();
        });
        
        container.append(card);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function selectStationFromFavorite(code, title) {
    if (typeof window.selectStationByCode === 'function') {
        window.selectStationByCode(code, title);
    }
}
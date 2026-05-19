// favorites.js - Модуль для работы с избранными станциями

class FavoritesManager {
    constructor() {
        this.favorites = [];
        this.storageKey = 'favoriteStations';
        this.load();
    }
    
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            this.favorites = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Ошибка загрузки избранного:', error);
            this.favorites = [];
        }
    }
    
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.favorites));
        } catch (error) {
            console.error('Ошибка сохранения избранного:', error);
        }
    }
    
    add(stationCode, stationTitle) {
        if (!this.isFavorite(stationCode)) {
            this.favorites.push({ code: stationCode, title: stationTitle });
            this.save();
            return true;
        }
        return false;
    }
    
    remove(stationCode) {
        const index = this.favorites.findIndex(f => f.code === stationCode);
        if (index !== -1) {
            this.favorites.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    }
    
    toggle(stationCode, stationTitle) {
        if (this.isFavorite(stationCode)) {
            this.remove(stationCode);
            return { action: 'removed', title: stationTitle };
        } else {
            this.add(stationCode, stationTitle);
            return { action: 'added', title: stationTitle };
        }
    }
    
    isFavorite(stationCode) {
        return this.favorites.some(f => f.code === stationCode);
    }
    
    getAll() {
        return [...this.favorites];
    }
    
    getCount() {
        return this.favorites.length;
    }
    
    clear() {
        this.favorites = [];
        this.save();
    }
}

const favoritesManager = new FavoritesManager();
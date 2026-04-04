import json
import os
from yaschedule.core import YaSchedule

def init_api(api_key):
    return YaSchedule(api_key)

def load_all_stations(api_key):
    cache_file = 'stations_cache.json'
    
    if os.path.exists(cache_file):
        print("Загружаем станции из кеша...")
        with open(cache_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    print("Скачиваем список станций с API (это может занять минуту)...")
    yaschedule = init_api(api_key)
    stations_data = yaschedule.get_all_stations()
    
    with open(cache_file, 'w', encoding='utf-8') as f:
        json.dump(stations_data, f, ensure_ascii=False, indent=2)
    
    print("Список станций сохранен в кеш")
    return stations_data

def search_stations(stations_data, query):
    results = []
    query_lower = query.lower().strip()
    
    for country in stations_data.get('countries', []):
        for region in country.get('regions', []):
            for settlement in region.get('settlements', []):
                for station in settlement.get('stations', []):
                    title = station.get('title', '')
                    if query_lower in title.lower():
                        results.append({
                            'title': title,
                            'code': station.get('codes', {}).get('yandex_code'),
                            'settlement': settlement.get('title', '')
                        })
    
    return results[:20]
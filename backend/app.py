from flask import Flask, request, jsonify
from flask_cors import CORS
from yaschedule.core import YaSchedule
from stations_cache import load_all_stations, search_stations
import os

app = Flask(__name__)
CORS(app)  

API_KEY = "5c828416-5d57-4d80-ad6c-4ad09207f8cd"

yaschedule = YaSchedule(API_KEY)

print("Загрузка списка станций...")
stations_data = load_all_stations(API_KEY)
print("Готово!")

@app.route('/api/stations/search', methods=['GET'])
def search_stations_api():
    query = request.args.get('query', '')
    if len(query) < 2:
        return jsonify([])
    
    results = search_stations(stations_data, query)
    return jsonify(results)

@app.route('/api/schedule', methods=['GET'])
def get_station_schedule():
    station_code = request.args.get('station_code')
    if not station_code:
        return jsonify({'error': 'Не указана станция'}), 400
    
    try:     
        schedule = yaschedule.get_station_schedule(
            station=station_code, 
            transport_types='suburban'
        )
        return jsonify(schedule)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/between', methods=['GET'])
def get_between_schedule():
    from_code = request.args.get('from')
    to_code = request.args.get('to')
    
    if not from_code or not to_code:
        return jsonify({'error': 'Укажите обе станции'}), 400
    
    try:
        schedule = yaschedule.get_schedule(
            from_station=from_code, 
            to_station=to_code, 
            transport_types='suburban'
        )
        return jsonify(schedule)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/popular', methods=['GET'])
def get_popular_stations():    
    popular = [
        {'title': 'Москва (Киевский вокзал)', 'code': 's9603402'},
        {'title': 'Санкт-Петербург (Витебский)', 'code': 's9603551'},
        {'title': 'Казанский вокзал (Москва)', 'code': 's9603404'},
        {'title': 'Ярославский вокзал (Москва)', 'code': 's9603408'},
        {'title': 'Павелецкий вокзал (Москва)', 'code': 's9603405'},
    ]
    return jsonify(popular)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
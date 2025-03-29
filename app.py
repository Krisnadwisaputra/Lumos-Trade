from flask import Flask, jsonify, request, send_from_directory
import os
import json
import random
import time
from datetime import datetime
from threading import Thread
import logging

app = Flask(__name__, static_folder='./client/dist')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Simulated data
market_data = {
    "BTC/USDT": {
        "price": 65000.0,
        "change": 1.2,
        "timestamp": datetime.now().isoformat()
    },
    "ETH/USDT": {
        "price": 3200.0,
        "change": 0.8,
        "timestamp": datetime.now().isoformat()
    }
}

# Background thread for simulating price changes
def update_prices():
    while True:
        for symbol in market_data:
            change = (random.random() - 0.5) * 100
            market_data[symbol]["price"] += change
            market_data[symbol]["change"] = change
            market_data[symbol]["timestamp"] = datetime.now().isoformat()
        time.sleep(2)

# Start the background thread
price_thread = Thread(target=update_prices, daemon=True)
price_thread.start()

# API endpoints
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})

@app.route('/api/current-price', methods=['GET'])
def current_price():
    symbol = request.args.get('symbol', 'BTC/USDT')
    if symbol in market_data:
        return jsonify({
            "symbol": symbol,
            "price": str(market_data[symbol]["price"]),
            "change": str(market_data[symbol]["change"]) + "%",
            "timestamp": market_data[symbol]["timestamp"]
        })
    else:
        return jsonify({
            "symbol": symbol,
            "price": str(60000 + random.random() * 2000),
            "change": str(random.random() * 2 - 1) + "%",
            "timestamp": datetime.now().isoformat()
        })

@app.route('/api/exchange/balance', methods=['GET'])
def exchange_balance():
    return jsonify({
        "status": "success",
        "balance": {
            "USDT": 10000.00,
            "BTC": 0.5,
            "ETH": 5.0
        },
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/exchange/orders', methods=['GET'])
def exchange_orders():
    symbol = request.args.get('symbol', None)
    orders = [
        {
            "id": "123456789",
            "symbol": "BTC/USDT",
            "side": "buy",
            "type": "limit",
            "price": 64000.0,
            "amount": 0.01,
            "filled": 0.0,
            "remaining": 0.01,
            "status": "open",
            "timestamp": int(time.time() * 1000),
            "datetime": datetime.now().isoformat()
        }
    ]
    
    if symbol:
        filtered_orders = [order for order in orders if order["symbol"] == symbol]
        return jsonify({"status": "success", "orders": filtered_orders})
    
    return jsonify({"status": "success", "orders": orders})

@app.route('/api/exchange/trades', methods=['GET'])
def exchange_trades():
    symbol = request.args.get('symbol', 'BTC/USDT')
    trades = [
        {
            "id": "987654321",
            "symbol": symbol,
            "side": "buy",
            "price": 64500.0,
            "amount": 0.01,
            "cost": 645.0,
            "fee": {
                "cost": 0.65,
                "currency": "USDT"
            },
            "timestamp": int(time.time() * 1000) - 3600000,
            "datetime": (datetime.now().isoformat())
        },
        {
            "id": "987654322",
            "symbol": symbol,
            "side": "sell",
            "price": 65000.0,
            "amount": 0.01,
            "cost": 650.0,
            "fee": {
                "cost": 0.65,
                "currency": "USDT"
            },
            "timestamp": int(time.time() * 1000) - 1800000,
            "datetime": (datetime.now().isoformat())
        }
    ]
    return jsonify({"status": "success", "trades": trades})

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        # Return index.html for all other routes (SPA support)
        return "Trading Platform API is running"

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
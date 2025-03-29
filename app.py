from flask import Flask, jsonify, request, send_from_directory
import os
import json
import random
import time
from datetime import datetime
from threading import Thread
import logging
from binance.client import Client
from binance.exceptions import BinanceAPIException
import traceback

app = Flask(__name__, static_folder='./client')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Binance API configuration
API_KEY = os.environ.get('BINANCE_API_KEY')
API_SECRET = os.environ.get('BINANCE_API_SECRET')

# Initialize Binance client
binance_client = None
use_simulation = True

try:
    if API_KEY and API_SECRET:
        binance_client = Client(API_KEY, API_SECRET)
        # Test connection
        binance_client.get_account_status()
        use_simulation = False
        logger.info("Successfully connected to Binance API")
    else:
        logger.warning("Binance API credentials not found, using simulation mode")
except BinanceAPIException as e:
    logger.error(f"Binance API error: {e.message} (code: {e.code})")
    if e.code == -2015:  # Invalid API key
        logger.error("Invalid API key provided")
    elif e.code == 429:  # Rate limit exceeded
        logger.error("Rate limit exceeded")
    use_simulation = True
except Exception as e:
    logger.error(f"Error connecting to Binance: {str(e)}")
    logger.error(traceback.format_exc())
    use_simulation = True

# Simulated data
market_data = {
    "BTCUSDT": {
        "price": 65000.0,
        "change": 1.2,
        "timestamp": datetime.now().isoformat()
    },
    "ETHUSDT": {
        "price": 3200.0,
        "change": 0.8,
        "timestamp": datetime.now().isoformat()
    }
}

# Background thread for simulating price changes
def update_prices():
    while True:
        for symbol in market_data:
            # Use smaller changes for more realistic simulation
            change = (random.random() - 0.5) * 0.1 * market_data[symbol]["price"]
            market_data[symbol]["price"] += change
            market_data[symbol]["change"] = change / market_data[symbol]["price"] * 100
            market_data[symbol]["timestamp"] = datetime.now().isoformat()
        time.sleep(2)

# Start the background thread for simulation
if use_simulation:
    price_thread = Thread(target=update_prices, daemon=True)
    price_thread.start()
    logger.info("Started price simulation thread")

# Helper functions
def format_binance_symbol(symbol):
    """Convert a symbol like BTC/USDT to BTCUSDT format for Binance API"""
    if '/' in symbol:
        return symbol.replace('/', '')
    return symbol

def format_api_symbol(symbol):
    """Convert a symbol from Binance format (BTCUSDT) to API format (BTC/USDT)"""
    if symbol.endswith('USDT'):
        base = symbol[:-4]
        return f"{base}/USDT"
    return symbol

# API endpoints
@app.route('/api/health', methods=['GET'])
def health_check():
    status = "simulation" if use_simulation else "connected_to_binance"
    return jsonify({
        "status": status, 
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/current-price', methods=['GET'])
def current_price():
    symbol = request.args.get('symbol', 'BTC/USDT')
    binance_symbol = format_binance_symbol(symbol)
    
    try:
        if not use_simulation and binance_client:
            # Use real Binance data
            ticker = binance_client.get_ticker(symbol=binance_symbol)
            price = float(ticker['lastPrice'])
            price_change = float(ticker['priceChangePercent'])
            
            return jsonify({
                "symbol": symbol,
                "price": str(price),
                "change": str(price_change) + "%",
                "timestamp": datetime.now().isoformat()
            })
        else:
            # Use simulated data
            if binance_symbol in market_data:
                return jsonify({
                    "symbol": symbol,
                    "price": str(market_data[binance_symbol]["price"]),
                    "change": str(round(market_data[binance_symbol]["change"], 2)) + "%",
                    "timestamp": market_data[binance_symbol]["timestamp"]
                })
            else:
                # Create new symbol data if it doesn't exist
                base_price = 100.0 if binance_symbol.startswith("USD") else 1.0
                price = base_price * (1 + random.random())
                market_data[binance_symbol] = {
                    "price": price,
                    "change": random.random() * 2 - 1,
                    "timestamp": datetime.now().isoformat()
                }
                return jsonify({
                    "symbol": symbol,
                    "price": str(price),
                    "change": str(round(market_data[binance_symbol]["change"], 2)) + "%",
                    "timestamp": market_data[binance_symbol]["timestamp"]
                })
    except BinanceAPIException as e:
        logger.error(f"Binance API error: {e.message} (code: {e.code})")
        return jsonify({
            "status": "error",
            "message": f"Binance API error: {e.message}",
            "code": e.code
        }), 500
    except Exception as e:
        logger.error(f"Error fetching price: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error fetching price: {str(e)}"
        }), 500

@app.route('/api/exchange/balance', methods=['GET'])
def exchange_balance():
    try:
        if not use_simulation and binance_client:
            # Use real Binance account data
            account = binance_client.get_account()
            balances = {}
            
            # Filter out zero balances and format
            for balance in account['balances']:
                asset = balance['asset']
                free = float(balance['free'])
                locked = float(balance['locked'])
                
                if free > 0 or locked > 0:
                    balances[asset] = {
                        "free": free,
                        "locked": locked,
                        "total": free + locked
                    }
            
            return jsonify({
                "status": "success",
                "balance": balances,
                "timestamp": datetime.now().isoformat()
            })
        else:
            # Return simulated balance data
            return jsonify({
                "status": "success",
                "balance": {
                    "USDT": {
                        "free": 10000.00,
                        "locked": 2000.00,
                        "total": 12000.00
                    },
                    "BTC": {
                        "free": 0.5,
                        "locked": 0.1,
                        "total": 0.6
                    },
                    "ETH": {
                        "free": 5.0,
                        "locked": 0,
                        "total": 5.0
                    }
                },
                "timestamp": datetime.now().isoformat(),
                "simulation": True
            })
    except BinanceAPIException as e:
        if e.code == -2015:  # Invalid API key
            return jsonify({
                "status": "error",
                "message": "Invalid API key",
                "code": e.code
            }), 401
        elif e.code == 429:  # Rate limit
            return jsonify({
                "status": "error", 
                "message": "Rate limit exceeded",
                "code": e.code
            }), 429
        else:
            return jsonify({
                "status": "error",
                "message": e.message,
                "code": e.code
            }), 500
    except Exception as e:
        logger.error(f"Error fetching balance: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error fetching balance: {str(e)}"
        }), 500

@app.route('/api/exchange/orders', methods=['GET'])
def exchange_orders():
    symbol = request.args.get('symbol', None)
    binance_symbol = format_binance_symbol(symbol) if symbol else None
    
    try:
        if not use_simulation and binance_client:
            # Get real orders from Binance
            if binance_symbol:
                open_orders = binance_client.get_open_orders(symbol=binance_symbol)
            else:
                open_orders = binance_client.get_open_orders()
            
            # Format orders to match our API structure
            formatted_orders = []
            for order in open_orders:
                formatted_orders.append({
                    "id": order['orderId'],
                    "symbol": format_api_symbol(order['symbol']),
                    "side": order['side'].lower(),
                    "type": order['type'].lower(),
                    "price": float(order['price']) if 'price' in order else 0,
                    "amount": float(order['origQty']),
                    "filled": float(order['executedQty']),
                    "remaining": float(order['origQty']) - float(order['executedQty']),
                    "status": order['status'].lower(),
                    "timestamp": order['time'],
                    "datetime": datetime.fromtimestamp(order['time']/1000).isoformat()
                })
            
            return jsonify({"status": "success", "orders": formatted_orders})
        else:
            # Return simulated orders
            orders = [
                {
                    "id": "123456789",
                    "symbol": symbol if symbol else "BTC/USDT",
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
                return jsonify({"status": "success", "orders": filtered_orders, "simulation": True})
            
            return jsonify({"status": "success", "orders": orders, "simulation": True})
    except BinanceAPIException as e:
        error_response = {
            "status": "error",
            "message": e.message,
            "code": e.code
        }
        status_code = 429 if e.code == 429 else 401 if e.code == -2015 else 500
        return jsonify(error_response), status_code
    except Exception as e:
        logger.error(f"Error fetching orders: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error fetching orders: {str(e)}"
        }), 500

@app.route('/api/exchange/trades', methods=['GET'])
def exchange_trades():
    symbol = request.args.get('symbol', 'BTC/USDT')
    binance_symbol = format_binance_symbol(symbol)
    limit = int(request.args.get('limit', 10))
    
    try:
        if not use_simulation and binance_client:
            # Get real trades from Binance
            my_trades = binance_client.get_my_trades(symbol=binance_symbol, limit=limit)
            
            # Format trades to match our API structure
            formatted_trades = []
            for trade in my_trades:
                formatted_trades.append({
                    "id": trade['id'],
                    "symbol": format_api_symbol(trade['symbol']),
                    "side": "buy" if trade['isBuyer'] else "sell",
                    "price": float(trade['price']),
                    "amount": float(trade['qty']),
                    "cost": float(trade['quoteQty']),
                    "fee": {
                        "cost": float(trade['commission']),
                        "currency": trade['commissionAsset']
                    },
                    "timestamp": trade['time'],
                    "datetime": datetime.fromtimestamp(trade['time']/1000).isoformat()
                })
            
            return jsonify({"status": "success", "trades": formatted_trades})
        else:
            # Return simulated trades
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
            return jsonify({"status": "success", "trades": trades, "simulation": True})
    except BinanceAPIException as e:
        error_response = {
            "status": "error",
            "message": e.message,
            "code": e.code
        }
        status_code = 429 if e.code == 429 else 401 if e.code == -2015 else 500
        return jsonify(error_response), status_code
    except Exception as e:
        logger.error(f"Error fetching trades: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error fetching trades: {str(e)}"
        }), 500

@app.route('/api/exchange/create-order', methods=['POST'])
def create_order():
    data = request.json
    symbol = data.get('symbol')
    side = data.get('side')
    order_type = data.get('type', 'LIMIT')
    quantity = data.get('quantity')
    price = data.get('price')
    
    if not all([symbol, side, quantity]):
        return jsonify({
            "status": "error",
            "message": "Missing required parameters"
        }), 400

    binance_symbol = format_binance_symbol(symbol)
    
    try:
        if not use_simulation and binance_client:
            # Create real order on Binance
            order_params = {
                'symbol': binance_symbol,
                'side': side.upper(),
                'type': order_type.upper(),
                'quantity': quantity
            }
            
            if order_type.upper() == 'LIMIT' and price:
                order_params['price'] = price
                order_params['timeInForce'] = 'GTC'
            
            response = binance_client.create_order(**order_params)
            
            # Format response
            formatted_order = {
                "id": response['orderId'],
                "symbol": format_api_symbol(response['symbol']),
                "side": response['side'].lower(),
                "type": response['type'].lower(),
                "price": float(response['price']) if 'price' in response else 0,
                "amount": float(response['origQty']),
                "status": response['status'].lower(),
                "timestamp": response['transactTime'] if 'transactTime' in response else int(time.time() * 1000),
                "datetime": datetime.now().isoformat()
            }
            
            return jsonify({
                "status": "success", 
                "order": formatted_order
            })
        else:
            # Simulate order creation
            order_id = str(int(time.time() * 1000))
            order = {
                "id": order_id,
                "symbol": symbol,
                "side": side.lower(),
                "type": order_type.lower(),
                "price": float(price) if price else market_data.get(binance_symbol, {}).get("price", 0),
                "amount": float(quantity),
                "filled": 0.0,
                "remaining": float(quantity),
                "status": "open",
                "timestamp": int(time.time() * 1000),
                "datetime": datetime.now().isoformat()
            }
            
            return jsonify({
                "status": "success",
                "order": order,
                "simulation": True
            })
    except BinanceAPIException as e:
        error_response = {
            "status": "error",
            "message": e.message,
            "code": e.code
        }
        status_code = 429 if e.code == 429 else 401 if e.code == -2015 else 400
        return jsonify(error_response), status_code
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error creating order: {str(e)}"
        }), 500

@app.route('/api/exchange/cancel-order', methods=['DELETE'])
def cancel_order():
    order_id = request.args.get('orderId')
    symbol = request.args.get('symbol')
    
    if not order_id or not symbol:
        return jsonify({
            "status": "error",
            "message": "Missing orderId or symbol parameter"
        }), 400
    
    binance_symbol = format_binance_symbol(symbol)
    
    try:
        if not use_simulation and binance_client:
            # Cancel real order on Binance
            result = binance_client.cancel_order(
                symbol=binance_symbol,
                orderId=order_id
            )
            
            return jsonify({
                "status": "success",
                "message": "Order cancelled successfully",
                "order": result
            })
        else:
            # Simulate order cancellation
            return jsonify({
                "status": "success",
                "message": "Order cancelled successfully",
                "simulation": True
            })
    except BinanceAPIException as e:
        error_response = {
            "status": "error",
            "message": e.message,
            "code": e.code
        }
        status_code = 429 if e.code == 429 else 401 if e.code == -2015 else 404 if e.code == -2011 else 500
        return jsonify(error_response), status_code
    except Exception as e:
        logger.error(f"Error cancelling order: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error cancelling order: {str(e)}"
        }), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Add CORS headers
    resp = None
    
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        resp = send_from_directory(app.static_folder, path)
    elif path == "":
        # Serve the index.html file for the root path
        resp = send_from_directory(app.static_folder, 'index.html')
    else:
        # Return API info for other paths that don't match API routes
        resp = jsonify({
            "name": "Lumos-Trade API",
            "version": "1.0.0",
            "status": "running",
            "mode": "simulation" if use_simulation else "live",
            "timestamp": datetime.now().isoformat()
        })
    
    return resp

# Add CORS headers to all responses
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Starting Flask server on port {port}, with static folder {app.static_folder}")
    app.run(host='0.0.0.0', port=port, debug=False) # Set debug=False to avoid reloader issues
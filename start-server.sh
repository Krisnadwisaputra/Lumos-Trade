#!/bin/bash
echo "Starting Flask server..."
nohup python app.py > flask.log 2>&1 &
echo "Server started with PID $!"
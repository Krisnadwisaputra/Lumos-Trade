#!/bin/bash

# Start the Flask server
echo "Starting Flask server..."
python app.py &

# Store the PID of the Flask process
FLASK_PID=$!

# Function to handle termination
cleanup() {
  echo "Shutting down Flask server..."
  # Kill the Flask process gracefully
  kill $FLASK_PID
  echo "Flask server stopped."
  exit 0
}

# Register the cleanup function for signals
trap cleanup SIGTERM SIGINT

echo "Flask server started with PID: $FLASK_PID"
echo "Keep this terminal open to keep the server running."
echo "Press Ctrl+C to stop the server."

# Keep the script running to maintain the background process
while kill -0 $FLASK_PID 2>/dev/null; do
  sleep 1
done

echo "Flask server has stopped unexpectedly."
import subprocess
import os
import time
import sys

print("Starting Flask server in background mode...")

# Run Flask in background
try:
    server_process = subprocess.Popen(
        ["python", "app.py"],
        stdout=None,  # Don't capture output
        stderr=None,  # Don't capture output
        stdin=subprocess.DEVNULL  # No input
    )
    
    # Print PID for debugging
    print(f"Flask server started with PID: {server_process.pid}")
    
    # Wait a moment for server to start
    time.sleep(3)
    
    # Check if the server is still running
    if server_process.poll() is not None:
        print("Error: Flask server failed to start properly")
        sys.exit(1)
    
    # Keep the process reference but don't block
    print("Flask server is running in the background")
    
    # Stay running to keep the process alive in Replit
    try:
        while True:
            # Every 10 seconds, check if process is still alive
            if server_process.poll() is not None:
                print(f"Flask server stopped with exit code: {server_process.returncode}")
                break
            time.sleep(10)
    except KeyboardInterrupt:
        print("Keyboard interrupt received. Shutting down...")
    finally:
        # Try to terminate the process gracefully
        if server_process.poll() is None:
            print("Stopping Flask server...")
            server_process.terminate()
            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print("Flask server did not terminate in time, killing...")
                server_process.kill()
        print("Flask server stopped")

except Exception as e:
    print(f"Error starting Flask server: {e}")
    sys.exit(1)
import os
import sys
import time
import signal
import subprocess
import threading

def start_flask():
    print("Starting Flask application...")
    flask_process = subprocess.Popen(
        ["python", "app.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True
    )
    
    def read_flask_output():
        if flask_process.stdout:  # Ensure stdout is not None
            for line in flask_process.stdout:
                print(f"[Flask] {line.strip()}")
    
    # Start output reading in a separate thread
    output_thread = threading.Thread(target=read_flask_output)
    output_thread.daemon = True
    output_thread.start()
    
    return flask_process

def main():
    print("Initializing server...")
    
    try:
        flask_process = start_flask()
        print(f"Flask server started with PID {flask_process.pid}")
        
        # Keep the script running
        while True:
            # Check if Flask process is still running
            if flask_process.poll() is not None:
                print("Flask server has stopped unexpectedly. Restarting...")
                flask_process = start_flask()
            
            time.sleep(5)
                
    except KeyboardInterrupt:
        print("Shutting down...")
        try:
            if 'flask_process' in locals() and flask_process:
                flask_process.terminate()
                flask_process.wait()
        except Exception as e:
            print(f"Error during shutdown: {e}")
        print("Servers stopped.")
        sys.exit(0)

if __name__ == "__main__":
    main()
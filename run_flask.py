import subprocess
import time
import sys
import os
import signal

# Function to handle clean termination
def signal_handler(sig, frame):
    print("Shutting down Flask server...")
    if 'process' in globals():
        process.terminate()
        process.wait(timeout=5)
    print("Server stopped.")
    sys.exit(0)

# Register the signal handler
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

print("Starting Flask server...")
try:
    # Set environment variables if needed
    env = os.environ.copy()
    
    # Start the Flask process
    process = subprocess.Popen(['python', 'app.py'], 
                              stdout=subprocess.PIPE, 
                              stderr=subprocess.STDOUT, 
                              universal_newlines=True,
                              env=env)
    
    print(f"Flask server started with PID {process.pid}")
    
    # Print output in real-time
    while True:
        output = process.stdout.readline()
        if output == '' and process.poll() is not None:
            break
        if output:
            print(output.strip())
            sys.stdout.flush()
        time.sleep(0.1)
    
    rc = process.poll()
    print(f"Flask server stopped with return code {rc}")
    
except KeyboardInterrupt:
    print("Shutting down Flask server...")
    if 'process' in locals():
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
    print("Server stopped.")
    sys.exit(0)

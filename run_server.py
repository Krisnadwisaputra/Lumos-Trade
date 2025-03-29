import subprocess
import time
import sys
import os

print("Starting Flask server...")
# We don't use nohup here because we want to keep the process managed by this script
cmd = ["python", "app.py"]
try:
    # Run the process without shell=True for better security
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=os.environ.copy()
    )
    
    # Report the process ID for debugging
    print(f"Flask server started with PID {process.pid}")
    
    # Loop to read output in real-time
    while True:
        # Read a line from stdout
        stdout_line = process.stdout.readline()
        if stdout_line:
            print(f"[OUT] {stdout_line.strip()}")
            sys.stdout.flush()
        
        # Read a line from stderr
        stderr_line = process.stderr.readline()
        if stderr_line:
            print(f"[ERR] {stderr_line.strip()}")
            sys.stderr.flush()
        
        # Check if the process is still running
        if process.poll() is not None:
            # Process has ended, check for any remaining output
            for line in process.stdout.readlines():
                print(f"[OUT] {line.strip()}")
            for line in process.stderr.readlines():
                print(f"[ERR] {line.strip()}")
            break
        
        # Short delay to prevent CPU hogging
        time.sleep(0.1)
    
    # Get the return code
    return_code = process.poll()
    print(f"Flask server stopped with return code {return_code}")
    sys.exit(return_code)
    
except KeyboardInterrupt:
    print("\nTerminating Flask server...")
    try:
        process.terminate()
        process.wait(timeout=5)
    except:
        process.kill()
        print("Had to force kill the Flask process")
    print("Server shutdown complete")
except Exception as e:
    print(f"Error running Flask server: {e}")
    sys.exit(1)
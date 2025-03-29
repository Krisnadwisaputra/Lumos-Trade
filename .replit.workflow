name = "Start application"
onBoot = true

[tasks.start]
command = "python run_app.py"
runAtStart = true
persistent = true
restartOn.files = ["app.py", "run_app.py"]

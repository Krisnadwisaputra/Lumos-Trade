name = "Start application"
onBoot = true

[tasks.start]
command = "python app.py"
runAtStart = true
persistent = true
restartOn.files = ["app.py"]

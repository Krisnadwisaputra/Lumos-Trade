name = "Start application"
onBoot = true

[tasks.start]
command = "PYTHONPATH=.pythonlibs python app.py"
runAtStart = true
persistent = true

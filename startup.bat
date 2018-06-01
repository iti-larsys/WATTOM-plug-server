@echo @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@echo WATTAPP
@ipconfig |findstr "IPv4" | cut -f2 -d ':' > tmp
@set /p ip=<tmp
@echo http://%ip:~1%:3000
@del tmp
@echo @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

@cd %~dp0
@cd Node-Server-Plugs
@npm start
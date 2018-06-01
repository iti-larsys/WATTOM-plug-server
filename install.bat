@echo @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@echo WATTAPP - INSTALLATION
@echo @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

@echo Downloading Bonjour SDK...
@certutil.exe -urlcache -split -f "https://softpedia-secure-download.com/dl/b9c690fc6368102d17055b23e177dd1d/5b108802/100159413/software/programming/bonjoursdksetup.exe" b.exe
@echo Bonjour SDK downloaded!
@PAUSE

@echo Installing Bonjour SDK...
@b.exe
@echo Bonjour SDK installed!
@PAUSE

@echo Installing Windows Build Tools...
@npm install --global --production windows-build-tools
@echo Windows Build Tools installed!
@PAUSE

@cd %~dp0
@cd Node-Server-Plugs
@echo Rebuilding NPM...
@npm rebuild
@echo NPM rebuilt!
@PAUSE

@echo DONE!!
@PAUSE
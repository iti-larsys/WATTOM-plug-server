main: exec
exec:
	@x-terminal-emulator -e "./startup.sh" > /dev/null;
install:
	@./install.sh


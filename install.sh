#!/bin/sh
echo "\033[1;31m@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@" 
echo "WATTAPP - INSTALLATION"
echo "\033[1;31m@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@" 

echo "Installing packages..."
sudo apt-get install libavahi-compat-libdnssd-dev
echo "Packages installed!"

cd Node-Server-Plugs

echo "Rebuilding NPM..."
npm rebuild
echo "NPM rebuilt!"

echo "DONE!"


#!/bin/sh
echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@" 
echo "WATTAPP - INSTALLATION"
echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@" 

echo "Installing packages..."
sudo apt-get install node
sudo apt-get install libavahi-compat-libdnssd-dev
echo "Packages installed!"

cd Node-Server-Plugs

echo "Rebuilding NPM..."
npm rebuild
echo "NPM rebuilt!"

echo "DONE!"


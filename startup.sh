#!/bin/sh
echo "\033[1;31m@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@" 
echo "WATTAPP"
echo "\033[1;33mhttp://$(hostname -I | cut -f1 -d' '):3000/\033[1;31m"
echo "\033[1;31m@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@" 

cd Node-Server-Plugs
npm start
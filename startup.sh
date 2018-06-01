#!/bin/sh
echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@" 
echo "WATTAPP"
echo "http://$(hostname -I | cut -f1 -d' '):3000/"
echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@" 

cd Node-Server-Plugs
npm start
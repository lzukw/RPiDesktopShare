#!/bin/bash

# this script should be run as root !

# change to directory, where this script is in
cd "$(dirname "$0")/public/local_streaming_sink"

if [ -z $PORT ]
then
  PORT_SUFFIX=":3000"
elif [ $PORT = "80" ]
then
  PORT_SUFFIX=""
else
  PORT_SUFFIX=":$PORT"
fi

while :
do
  # Create current_wlan_info.txt
  echo "$(wpa_cli -i wlan0 status | grep -e "^ssid")" > current_wlan_info.txt
  echo "$(wpa_cli -i wlan0 status | grep -e "^bssid")" >> current_wlan_info.txt
  echo "$(wpa_cli -i wlan0 status | grep -e "^freq")" >> current_wlan_info.txt
  echo -n "$(wpa_cli -i wlan0 status | grep -e "^ip_address")" >> current_wlan_info.txt
  chown 1000:1000 current_wlan_info.txt

  # Create current_ssid.txt (no root-privileges required)
  echo -n "$(/sbin/iwgetid -r)" > current_ssid.txt
  chown 1000:1000 current_ssid.txt

  # Create current_urls.txt (no root-privileges required)
  # xargs removes leading and trailing whitespace
  echo "http://$(hostname -I | xargs)$PORT_SUFFIX" >  current_urls.txt
  # TODO get IPV6 address
  echo "http://$(hostname -s)$PORT_SUFFIX" >> current_urls.txt
  echo -n "http://$(hostname -s).local$PORT_SUFFIX" >> current_urls.txt
  chown 1000:1000 current_urls.txt

  sleep 3
  
done
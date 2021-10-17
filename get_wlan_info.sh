#!/bin/bash

# this script should be run as root !

# change to directory, where this script is in
cd "$(dirname "$0")"

while :
do
  # Create current_wlan_info.txt
  wpa_cli status | grep -e "^ssid" > current_wlan_info.txt
  wpa_cli status | grep -e "^bssid" >> current_wlan_info.txt
  wpa_cli status | grep -e "^freq" >> current_wlan_info.txt
  wpa_cli status | grep -e "^ip_address" >> current_wlan_info.txt

  # Create current_ssid.txt (no root-privileges required)
  /sbin/iwgetid -r > current_ssid.txt

  # Create current_urls.txt (no root-privileges required)
  hostname -I >  current_urls.txt
  # TODO get IPV6 address
  hostname -s >> current_urls.txt
  echo "$(hostname -s).local" >> current_urls.txt
  sleep 3
  
done
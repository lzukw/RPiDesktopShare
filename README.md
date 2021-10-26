# RPiDesktopShare

Stream contents of your Desktop (streaming source) to a Raspberry Pi or other Linux Box (streaming sink).

Project Status (as of 2021-10-26): Working fine

## Install on Raspberry pi (or other Linux-Computer used as streaming sink)

- First install `nodejs` and `npm` by running:

```
sudo apt install nodejs
sudo apt install npm
```

- Clone this repository and cd into it.
- run `npm install` to install the required node-modules.

## Prepare X.509-certificates on the straming sink

The core of this software is a nodejs-https-webserver and therefore needs an X.509-certificate. 

The easiest way is to use a simple self-signed-certificate and trust it, when connecting from the browser to the nodejs-webserver:

```
cd path/to/RPiDesktopShare
openssl req -x509 -days 3650 -newkey rsa -nodes \
  -keyout webserver.key -out webserver.crt 
```

You'll be asked some questions. It is not so important, what you type in here. You can type '.'  to leave the fields empty. Only in the `Common Name (e.g. server FQDN or YOUR name) []:`-Question you should type the servername of the Raspberry-Pi. This servername can be the hostname or hostname.local. You should be able to ping this servername from another computer. If you are using Linux-computers to connect to the Raspberry-pi-webserver hostname.local is a good choice:

To find out if a <hostname>.local "Common-Name" works for you: On the Raspberry-Pi type in a terminal:
```
echo "Use as hostname:" && echo "$(hostname).local"
```

On a remote computer which like to use as streaming source, type in a terminal:
```
ping <the name shown above by the echo-command>
```

If the ping works, you can use the shown name to answer the "Common Name"-question when creating the self-signed certificate.

In a more advances scenario you would use your own CA and private-signed-certificates instead of self-signed-certificates.

## Run the get_wlan_info.sh as root in background on the streaming sink

To get up-to-date info about current Wifi-Status and IP-address run the script `get_wlan_info.sh` as root in backgound. 

```
sudo bash ./get_wlan_info.sh &
```

Note, that the previous step is optional, if you don't need up-to-date info, or the script does not work for you, just don't run the script. Root-privilegus are needed, because the script uses `wpacli status`. This script just periodically replaces the contents of the following three files:

- `public/local_streaming_sink/current_ssid.txt`
- `public/local_streaming_sink/current_urls.txt`
- `public/local_streaming_sink/current_wlan_info.txt`

Maybe you have to tweak the script `get_wlan_info.sh`. The WLAN-interface is supposed to be `wlan0`. If you are on another Linux-Computer and not on a Raspberry Pi, it would be better to use `nmcli` instead of `wpa_cli`. Then no root-privileges are required.

## Start the nodejs-webserver and a local browser on the streaming sink

Now start the nodejs-server in background, specifying a port via the command-line. If you would like to use the standard-https-Port (443) you will have to run the command with root-privilegus (sudo).

For example to use port 3000 (no root-privileges needed):

```
PORT=3000 node main.js &
```

The next step is to start a browser on the streaming sink (Raspberry pi). For chromium, type:

```
chromium-browser --kiosk https://<Common-Name-of-the-Rapsberry-pi-used-above>:3000/local_streaming_sink/main.html
```

## Connect the remote streaming-source to the Raspberry-pi

Open a Webbrowser on the streaming-source-computer, whose screen you like to stream to the Raspberry Pi. In the address-bar navigate to `https://<Common-Name-of-the-Rapsberry-pi-used-above>:3000`.

If you used a self-signed certificate you'll get an intimidating warning. Trust your self-signed-certificate and proceed to the website of the Raspberry pi. 

Then click the "Connect"-Button, and give consent to Desktop-Sharing. After a few moments you should see your Desktop on the screen of the Raspberry Pi.

## Setting up the Raspberry Pi

When setting up the Raspberry Pi as streaming sink, you need to perform additional setup, if you want the pi to start everything without user-interaction after booting:

- raspi-config: Boot to desktop with autologin of user pi
- raspi-config: Change hostname
- raspi-config: Prevent screen from blanking
- Automate starting of node and local browser in a shell-script (`sudo` can be used, because the user `pi` is not prompted for a password when doing `sudo`.
- After `sudo apt install xdotool` you can move the mousepointer from the command-line: `xdotool mousemove 4000 4000` moves the mouse-pointer to the lower left corner (so it is invisible). Add this to the shell-script.
- Create a `.desktop`-file in `~/.local/share/applications` that starts the shell script. Copy this file also  to `~./config/autostart` (not sure if a symbolic link also works).

## Project develoment history:

For the purpose of troubleshooting here is the project-history, listing all the issues I ran into during development. Browser-security-policies change quite often, so maybe there will arise more issues...

### First version using http instead of https

This worked only on localhost (streaming source and streaming sink on the same computer): The reason is, that webRTC needs a "Secure context", which means it is only allowed over https and not over http. However, http is considered a secure context, when only used on localhost.

### Second vcersion using https with a self-signed certificate

The main issue here is, that the user gets a security warning, and no user will ignore this warning. 

So if using this project for a limited number of users (for example in small/middle company or for all teachers in a school), a private-signed-certificate should be used. Then the root-certificate of the self made CA must be imported into every client-browser. Sharing the root-certificate-file and a pdf-instruction with screenshots, indicating how to import the certificate into the browser should be enough to get most users connecting to existing streaming-sinks. 

Here is an instruction how to create the CA-private-key, CA-certificate and private-key and certificate for the Webserver (last visited on 2021-10-26):

[How to Create Your Own SSL Certificate Authority for Local HTTPS Development](https://deliciousbrains.com/ssl-certificate-authority-for-local-https-development/) 

The file-names of the certificate and key used by the nodejs-webserver are hard-coded in `main.js`. You have to use `webserver.key` and `webserver.crt` (or change the two corresponding lines in `main.js`).

### User interaction required on streaming sink

With the second version, another security issue arose on the streaming sink: From javascript (`streaming_sink.js`) the call to `video_elt.play()`, which should start to display the received video-stream in the `<video id="remote_stream">`-Element, yields the following error (in the browser-console):

```
Uncaught (in promise) DOMException: play() failed because the user didn't interact with the document first.
https://goo.gl/xX8pDD
```

The mentioned URL in the error-message leads to [Autoplay policy in Chrome](https://developer.chrome.com/blog/autoplay/). Here is stated, that:

- Muted autoplay is always allowed.
- Autoplay with sound is allowed if: The user has interacted with the domain (click, tap, etc.).

Adding `video_elt.muted = true` before calling `video_elt.play()` solved the issue.
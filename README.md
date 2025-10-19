# VHS Tool Auth service

This is a small service that allows VHS to use nginx reverse proxies to authenticate users, allowing access to internal tools like our laser cutter and our 3d printers.

How it works:

1. a tool sits behind an nginx reverse proxy, something like a raspberri pi running klipper/mainsail and connected to one or more 3d printers.
2. nginx uses a short lua script to check requests headed for the tool for a valid JWT cookie
3. if the cookie isn't present, nginx redirects the request to `/login` which is proxied to this service. It tags these requests with the X-Permission header to select which permission we're checking for.
4. the `/login` endpoint presents a login page, takes the user's username and password, and uses it to login to nomos and check the user's permissions for access to this particular tool.
5. if the user has permission to use this tool, they are issued a JWT cookie that's valid for 1 day, and re-directed to the tool's main page

The tool is secured by configuring it to deny requests from anything but the proxy server.

THe nginx configuration is stored in `nginx.conf`, this needs to be added to a proxy set up in nginx proxy manager.

![A screenshot of the setup in NPM](images/nginx_proxy_manager_setup.png "NPM setup screenshot")

# Deployment

- This is deployed on a proxmox lxc container on premise at VHS.
- It's kept running by pm2
- It's updated periodically by polling this repo using the `poll.sh` script
- Polling is managed by a crontab entry
- To re-create this setup, do this:
    - create an alpine container on proxmox: `bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/alpine.sh)"`
    - inside the container
        - add git, nodejs: `apk add git nodejs`
        - add alpine community repo: `echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories`
        - add yarn: `apk add yarn`
        - install pm2 globally `yarn global add pm2`
        - persist pm2, so it starts on boot: `pm2 startup`
        - clone this repo: `git clone git@github.com:coryalder/vhs-tool-auth.git`
        - start the app using pm2: `pm2 start app.pm2.json`
        - add the poll script to crontab: `idk how to do this yet`

## Cheatsheet

- restart the service: `pm2 delete vhs-tool-auth && pm2 start app.pm2.json && pm2 save`
- pull the latest version of the repo: `./poll.sh`
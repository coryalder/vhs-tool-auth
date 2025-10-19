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

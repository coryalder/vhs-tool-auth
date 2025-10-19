// login routes

import { FastifyInstance, RouteShorthandOptions } from "fastify"
import fetch from 'node-fetch';

// this is done to keep all the config in index.ts, while splitting the code into two files
interface LoginRouteOptions {
    jwtCookieName: string;
    valid_permissions_to_check_for: string[];
}

const loginGetOpts: RouteShorthandOptions = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                error: { type: 'string' }
            },
        }
    }
}

interface LoginQuery {
    error: string | undefined;
}

const loginPostOpts: RouteShorthandOptions = {
    schema: {
        body: {
            type: 'object',
            required: ['username', 'password'],
            properties: {
                username: { type: 'string' },
                password: { type: 'string' },
            },
        }
    }
}

interface LoginBody {
    username: string;
    password: string;
}

export async function loginRoutes(server: FastifyInstance, options: LoginRouteOptions) {
    // Send an HTML login page. The only dynamic bit of this is the error query param
    server.get("/login", loginGetOpts, (req, reply) => {
        let queryObj = req.query as LoginQuery
        reply.view("views/login.pug", { error: queryObj.error, permission_requested: req.headers["x-permission"] });
    })

    // Takes a username and password, uses it to login and check permissions on nomos
    // if successful it sets a JWT cookie and bounces you back to the main page.
    server.post("/login", loginPostOpts, async (req, reply) => {
        const userAndPass = req.body as LoginBody;

        try {
            let sp = req.headers["x-permission"]
            let seeking_permission: string
            if (Array.isArray(sp)) {
                seeking_permission = sp[0] ?? ""
            } else {
                seeking_permission = sp ?? ""
            }

            if (!options.valid_permissions_to_check_for.includes(seeking_permission)) {
                throw new Error(`This permission (${seeking_permission}) isn't whitelisted, get an admin to add it to valid_permissions_to_check_for`)
            }

            const loginResponse = await fetch(
                'https://membership.vanhack.ca/services/web/AuthService1.svc/Login',
                {
                    method: 'POST',
                    body: JSON.stringify(userAndPass)
                }
            );

            const cookie = loginResponse.headers.get("set-cookie");
            const body = await loginResponse.text();

            if (loginResponse.status != 200 || body != "\"Access Granted\"" || !cookie) {
                throw new Error(`Login failed: ${body}`);
            }

            const permissionsResponse = await fetch(
                'https://membership.vanhack.ca/services/web/AuthService1.svc/CurrentUser',
                {
                    headers: {
                        "Cookie": cookie
                    }
                }
            );

            let data = await permissionsResponse.json() as any;
            // {"id":809,"permissions":["door","vetted","door","laser","administrator","grant:laser","tablesaw","tool:wood:jointer-planer","grants","user"]}

            let permissions = data.permissions;
            if (!permissions) {
                throw new Error("No permissions found")
            }

            if (!Array.isArray(permissions)) {
                throw new Error("Bad permissions recieved")
            }

            if (!permissions.includes(seeking_permission)) {
                throw new Error(`User does not have ${seeking_permission} permission`)
            }

            // ok all the tests are passed, so send a JWT and redirect to the main page
            const token = await reply.jwtSign({
                userId: data.id ?? "no_id",
                permission: seeking_permission
            })

            reply
                .setCookie(options.jwtCookieName, token, {
                    domain: 'foo.local',
                    path: '/',
                    //secure: true, // send cookie over HTTPS only
                    httpOnly: true,
                    sameSite: true // alternative CSRF protection
                }).redirect('/')

        } catch (e: unknown) {
            let errorMessage: string = ""

            if (typeof e === "string") {
                errorMessage = e;
            } else if (e instanceof Error) {
                errorMessage = e.message
            }

            reply.redirect(`/login?error=${encodeURIComponent(errorMessage)}`)
        }
    })
}


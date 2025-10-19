import Fastify, { FastifyInstance, RouteShorthandOptions } from 'fastify'
//import { Server, IncomingMessage, ServerResponse } from 'http'
import { fastifyView } from '@fastify/view';
import { fastifyFormbody } from '@fastify/formbody';
import { fastifyJwt } from '@fastify/jwt';
import { fastifyCookie } from '@fastify/cookie';
import pug from 'pug';
import fetch from 'node-fetch';

const server: FastifyInstance = Fastify({ logger: true })

// a whitelist for permissions we're ok with gatewaying
// the permission we're checking for is passed by the proxy as an X-Permission header
const valid_permissions_to_check_for = ["laser", "3d-printer"]
const jwtCookieName = "vhsAuthJwt"
const jwtSecret = "your_secret_key" // process.env.JWT_SECRET 

server.register(fastifyView, { engine: { pug: pug } })
server.register(fastifyFormbody)
server.register(fastifyCookie)
server.register(fastifyJwt, {
  secret: jwtSecret,
  cookie: {
    cookieName: jwtCookieName,
    signed: false
  },
  sign: {
    expiresIn: '1d'
  }
})

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

interface LoginQuery {
    error: string | undefined;
}

server.get("/login", loginGetOpts, (req, reply) => {
    let queryObj = req.query as LoginQuery
  reply.view("views/login.pug", { error: queryObj.error, permission_requested: req.headers["x-permission"] });
})

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

        if (!valid_permissions_to_check_for.includes(seeking_permission)) {
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
            .setCookie(jwtCookieName, token, {
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

const start = async () => {
  try {
    await server.listen({ port: 3000, host: "0.0.0.0" })

    const address = server.server.address()
    const port = typeof address === 'string' ? address : address?.port
    server.log.warn(`starting server @ ${address}:${port}`)

  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()

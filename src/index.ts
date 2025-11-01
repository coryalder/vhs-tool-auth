import Fastify, { FastifyInstance } from 'fastify'
import { fastifyView } from '@fastify/view';
import { fastifyFormbody } from '@fastify/formbody';
import { fastifyJwt } from '@fastify/jwt';
import { fastifyCookie } from '@fastify/cookie';
import { fastifyStatic } from '@fastify/static';
import pug from 'pug';
import { loginRoutes } from './login.js';
import path from 'node:path';
import { config } from './config.js'
import permissionValidator from './permission.js'

const server: FastifyInstance = Fastify({
  logger: {
    transport: {
      target: "@fastify/one-line-logger",
    },
  },
})

// how long do the JWTs we issue last?
const jwtCookieExpiration = "1d";

// a whitelist for permissions we're ok with gatewaying
// the permission we're checking for is passed by the proxy as an X-Permission header
const valid_permissions_to_check_for = [
  "laser",
  "3d-printer",
  "tablesaw",
  "tool:wood:jointer-planer",
  "tool:wood:cnc",
  "tool:metal:lathe",
  "tool:metal:cnc",
  "tool:metal:mill"
]

if (!config.jwt.secret || !config.jwt.cookieName) {
  throw new Error("Missing JWT config. These are loaded from a config.json file in the root of the project. Check ./src/config.ts for the schema.");
}

// view engine for templates
server.register(fastifyView, { engine: { pug: pug } })

// handle the login form body
server.register(fastifyFormbody)

// cookies & jwts
server.register(fastifyCookie)
server.register(fastifyJwt, {
  secret: config.jwt.secret,
  cookie: {
    cookieName: config.jwt.cookieName,
    signed: false
  },
  sign: {
    expiresIn: jwtCookieExpiration
  }
})

// register the permission header plugin
server.register(permissionValidator, { whitelist: valid_permissions_to_check_for })

// serve static files
server.register(fastifyStatic, {
  root: path.join(import.meta.dirname, '..', 'static'),
  prefix: '/static/',
  //constraints: { host: 'example.com' } // optional: default {}
})

// /login routes
server.register(loginRoutes, {
  jwtCookieName: config.jwt.cookieName
})

// start the server
const start = async () => {
  try {
    await server.listen({ port: config.port, host: "0.0.0.0" })

    const address = server.server.address()
    const port = typeof address === 'string' ? address : address?.port
    
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()

import Fastify, { FastifyInstance, RouteShorthandOptions } from 'fastify'
import { fastifyView } from '@fastify/view';
import { fastifyFormbody } from '@fastify/formbody';
import { fastifyJwt } from '@fastify/jwt';
import { fastifyCookie } from '@fastify/cookie';
import pug from 'pug';
import { loginRoutes } from './login.js';

const server: FastifyInstance = Fastify({ logger: true })

const jwtSecret = process.env.JWT_SECRET
const jwtCookieName = "vhsAuthJwt"
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

if (!jwtSecret) {
  throw new Error("Missing a JWT_SECRET environment variable. Check for a .env file in the root of the project, and check that it's being loaded by node --env-file=.env when you're starting this service.");
}

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

server.register(loginRoutes, {
  jwtCookieName,
  valid_permissions_to_check_for
})

const start = async () => {
  try {
    await server.listen({ port: 3000, host: "0.0.0.0" })

    const address = server.server.address()
    const port = typeof address === 'string' ? address : address?.port
    
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()

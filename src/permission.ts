import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

interface JWTPayloadType {
  userId: string
  permission: string
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JWTPayloadType // payload type is used for signing and verifying
    user: JWTPayloadType // payload type that is attached to the request object
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    seeking_permission: string
  }
}

// define options
export interface PermissionPluginOptions {
    whitelist: string[]
}

// define plugin using promises
const permissionValidatorPlugin: FastifyPluginAsync<PermissionPluginOptions> = async (fastify, options) => {
    fastify.decorateRequest('seeking_permission', '')

    fastify.addHook("onRequest", async (request, reply) => {
        let sp = request.headers["x-permission"]
        let seeking_permission: string
        if (Array.isArray(sp)) {
            seeking_permission = sp[0] ?? ""
        } else {
            seeking_permission = sp ?? ""
        }

        if (!seeking_permission || seeking_permission.length < 1) {
            throw new Error("Missing x-permission headr")
        }

        if (!options.whitelist.includes(seeking_permission)) {
            throw new Error(`This permission (${seeking_permission}) isn't whitelisted, get an admin to add it to the whitelist`)
        }

        request.seeking_permission = seeking_permission
    })
}

// export plugin using fastify-plugin
export default fp(permissionValidatorPlugin, '5.x')
    
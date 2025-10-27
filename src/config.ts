// configuration lives in ../config.json
// this is the type definition for it, with example values in comments

export interface Configuration {
    mqtt: {
        server: string // "mqtt://127.0.0.1"
        options: any // null
        topic: string // "laser/maintenance"
    }
    jwt: {
        cookieName: string // "vhsAuthJwt",
        secret: string // "<jwtSecret>"
    },
    port: number // 3000
}

import * as data from '../config.json' with { type: 'json' }

export const config: Configuration = data.default;

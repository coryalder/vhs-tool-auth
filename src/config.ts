// configuration lives in ../config.json
// this is the type definition for it, with example values in comments

export interface Configuration {
    jwt: {
        cookieName: string // "vhsAuthJwt",
        secret: string // "<jwtSecret>"
    },
    port: number // 3000
}

import * as data from '../config.json' with { type: 'json' }

export const config: Configuration = data.default;

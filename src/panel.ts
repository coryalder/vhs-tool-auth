
import { FastifyInstance, RouteShorthandOptions, RequestGenericInterface } from "fastify"

// this file isn't checked into version control yet, since it's just an experiment
// it's quite possible something like this should exist, but in nomos not this repo 

// What this would do is present a bunch of buttons based on the user's privledges
// When pressed the buttons would fire off an MQTT request to a smart plug that will activate it

// routes:
//
// - GET /panel/ - shows the page of buttons
// - POST /panel/press/(button_name) - presses a given button

// auth bounces out to the login area, which would need to store
// a LIST of permissions in the jwt so we know what to show people (now it only stores one)

interface PanelPressInterface extends RequestGenericInterface {
  Params: {
    action: string
  }
}

const panelPressOptions: RouteShorthandOptions = {
    schema: {
        params: {
            type: 'object',
            properties: {
                action: { type: 'string' }
            }
        }
    }
}

// here is where we fire of mqtt events
const panelActions: { [key: string]: ()=>void } = {
     "table-saw": ()=>{
        console.log("table saw action")
     },
    "jointer-planer": ()=>{
        console.log("jointer planer action")
    },
    "metal-cnc": ()=>{
        console.log("metal cnc action")
    },
    "wood-cnc": ()=>{
        throw new Error("wood cnc action failed")
    }
}

export async function panelRoutes(server: FastifyInstance) {
    // Send an HTML login page. The only dynamic bit of this is the error query param
    server.get("/panel", (req, reply) => {
        reply.view("views/panel.pug", { actions: Object.keys(panelActions) });
    })

    server.all<PanelPressInterface>("/panel/press/:action", panelPressOptions, (req, reply) => {
        const { action } = req.params;
        let actionFn = panelActions[action];
        if (!actionFn) {
            return reply.send({ action, status: "action not permitted" })
        }

        try {
            actionFn();
            reply.send({ action, status: "ok" })
        } catch(error: any) {
            reply.send({ action, status: error.toString() })
        }

    })
}
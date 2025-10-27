
import { FastifyInstance, RouteShorthandOptions, RequestGenericInterface } from "fastify"
import { config } from './config.js'
import mqtt from "mqtt";

const client = mqtt.connect(config.mqtt.server, config.mqtt.username ? {
    username: config.mqtt.username,
    password: config.mqtt.password ?? ""
} : {});

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

// here is where we fire of mqtt events
const panelActions: { [key: string]: ()=>void } = {
     "table-saw": ()=>{
        client.publish(config.mqtt.topic, "table-saw");
     },
    "jointer-planer": ()=>{
        client.publish(config.mqtt.topic, "jointer-planer");
    },
    "metal-cnc": ()=>{
        client.publish(config.mqtt.topic, "metal-cnc");
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

    server.all<PanelPressInterface>("/panel/press/:action", (req, reply) => {
        const { action } = req.params;
        let actionFn = panelActions[action];
        if (!actionFn) {
            return reply.send({ action, status: "action not permitted" })
        }

        try {
            reply.log.info(`performing action ${action}`)
            actionFn();
            reply.send({ action, status: "ok" })
        } catch(error: any) {
            reply.send({ action, status: error.toString() })
        }

    })
}


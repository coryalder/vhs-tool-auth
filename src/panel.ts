
import { FastifyInstance, RouteShorthandOptions, RequestGenericInterface } from "fastify"
import { config } from './config.js'
import mqtt from "mqtt";

// connect to mqtt service to send actions
const client = mqtt.connect(config.mqtt.server, config.mqtt.options);

interface PanelPressInterface extends RequestGenericInterface {
  Params: {
    action: string
  }
}

// Here is what we do when each action is triggered
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
    // Send the panel page with a list of actions the user can do
    server.get("/panel", (req, reply) => {
        reply.view("views/panel.pug", { actions: Object.keys(panelActions) });
    })

    // respond to the user pressing a button by checking auth and then performing the action
    // TODO: add a permissions check - store the permissions in the jwt during auth, check it here.
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


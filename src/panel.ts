
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

interface PanelAction {
    id: string
    name: string
    fn: ()=>void
}

interface PanelActionWireType {
    id: string
    name: string
}

// Here is what we do when each action is triggered
const panelActionList: PanelAction[] = [
    {
        id: "table-saw",
        name: "Table saw",
        fn: ()=>{
            client.publish(config.mqtt.topic, "table-saw");
        }
    },
    {
        id: "jointer-planer",
        name: "Jointer planer",
        fn: ()=>{
            client.publish(config.mqtt.topic, "jointer-planer");
        }
    },
    {
        id: "metal-cnc",
        name: "Metal CNC",
        fn: ()=>{
            client.publish(config.mqtt.topic, "metal-cnc");
        }
    },
    {
        id: "wood-cnc",
        name: "Wood CNC",
        fn: ()=>{
            throw new Error("wood cnc action failed")
        }
    }
]

// generate an index from the array of actions, for quick access via id
const panelActionIdIndex = panelActionList.reduce((prev: { [key: string]: PanelAction }, current: PanelAction)=>{
    prev[current.id] = current;
    return prev
}, {})

// create a version of the list without the fn property to send over the wire
const panelActionWireList = panelActionList.map((pa: PanelAction)=>{
    let paw: PanelActionWireType = {
        id: pa.id,
        name: pa.name
    }
    return paw;
})

export async function panelRoutes(server: FastifyInstance) {
    // Send the panel page with a list of actions the user can do
    server.get("/panel", (req, reply) => {
        reply.view("views/panel.pug", { actions: panelActionWireList });
    })

    // respond to the user pressing a button by checking auth and then performing the action
    // TODO: add a permissions check - store the permissions in the jwt during auth, check it here.
    server.all<PanelPressInterface>("/panel/press/:action", (req, reply) => {
        const { action } = req.params;
        let actionObj = panelActionIdIndex[action];

        if (!actionObj) {
            return reply.send({ action: action, status: "action not permitted" })
        }

        try {
            reply.log.info(`performing action ${action}`)
            actionObj.fn();
            reply.send({ action, status: "ok" })
        } catch(error: any) {
            reply.send({ action, status: error.toString() })
        }
    })
}


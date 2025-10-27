// the http post and error case checking for a panel action
//  returns => {
//      status: string ("ok" | error messages),
//      action: string <the requested action>
//  }
async function postAction(actionName) {
    const response = await fetch(`/panel/press/${actionName}`, {
        method: 'POST'
    });

    if (!response.ok) {
        // error handler
        throw new Error(`Server returned ${response.status}: ${response.statusText}`)
    }

    const body = await response.json();
    if (body.status != "ok") {
        throw new Error(`Press received error: ${body.status}`);
    }

    return body;
}

const Waiting = " ↻";
const Errored = " ❌";
const Success = " ✅";

// the UI state changes and error handling for a panel action
// this is what is called by the button itself
async function performAction(actionName, element) {
    const name = actionName.replace("-", "");

    element.disabled = true; // gray out icon
    element.ariaBusy = true // shows a spinner
    element.innerText = name

    document.getElementById("error").innerText = "";

    try {
        let data = await postAction(actionName);
        element.innerText = name + Success
    } catch (error) {
        document.getElementById("error").innerText = error;
        element.innerText = name + Errored
    } finally {
        //unmark button as in progress
        element.disabled = false;
        element.ariaBusy = false;
    }
}

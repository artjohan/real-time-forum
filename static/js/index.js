import { routeEvent } from "./views/chat.js"
import { router, navigateTo, Event, hasSession } from "./views/helpers.js"


window.addEventListener("popstate", router)

document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", event => {
        if(event.target.matches("[data-link]")) {
            event.preventDefault()
            navigateTo(event.target.href)
        }
    })
    router()
})

const isAuthorized = await hasSession()
if(isAuthorized) {
    const userData = JSON.parse(localStorage.getItem("userData"))
    const socket = new WebSocket(`ws://${document.location.host}/ws?userId=${userData.userId}`)

    console.log("Attempting websocket connection")

    socket.onopen = () => {
        console.log("successfully connected")
    }

    socket.onclose = (event) => {
        console.log("socket closed connection", event)
    }

    socket.onerror = (err) => {
        console.log("Socket error: ", err)
    }

    socket.onmessage = (e) => {
        const eventData = JSON.parse(e.data)

        const event = Object.assign(new Event, eventData)

        routeEvent(event)
    }

    window.socket = socket
}
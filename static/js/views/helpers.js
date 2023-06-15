import home from "./home.js"
import register from "./register.js"
import login, { hasCookie } from "./login.js"
import error from "./error.js"
import logout from "./logout.js"
import posts from "./posts.js"
import user from "./user.js"
import chat from "./chat.js"



export const navigateTo = url => {
    history.pushState(null, null, url)
    router()
}


export const router = async () => {
    const routes = [
        { path: "/", view: home },
        { path: "/register", view: register },
        { path: "/login", view: login },
        { path: "/logout", view: logout },
        { path: "/posts", view: posts },
        { path: "/user", view: user },
        { path: "/chat", view: chat },
    ]

    const potentialMatches = routes.map(route => {
        return {
            route: route,
            isMatch: location.pathname === route.path
        }
    })

    let match = potentialMatches.find(potentialMatch => potentialMatch.isMatch)
    if(match) {
        match.route.view()
    } else {
        error()
    }
}

export const hasSession = async () => {
    if(localStorage.getItem("userData")) {
        const userData = JSON.parse(localStorage.getItem("userData"))
        const sessionExists = await hasCookie(userData.cookieId)
        if(sessionExists) {
            return true
        } else {
            localStorage.removeItem("userData")
        }
    }
    return false
}

export const handleResponse = async (response) => {
    if(response.ok) {
        router()
    } else {
        const statusMsg = await response.text()
        console.log(statusMsg)
    }
}

export class Event {
    constructor(type, payload) {
        this.type = type
        this.payload = payload
    }
}
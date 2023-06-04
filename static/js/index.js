import home from "./views/home.js"
import register from "./views/register.js"
import login from "./views/login.js"
import error from "./views/error.js"

const navigateTo = url => {
    history.pushState(null, null, url)
    router()
}


const router = async () => {
    const routes = [
        { path: "/", view: home },
        { path: "/register", view: register },
        { path: "/login", view: login },
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
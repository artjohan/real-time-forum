import { sendEvent } from "./chat.js"
import { hasSession, navigateTo } from "./helpers.js"

export default async function() {
    if(hasSession()) {
        const userData = JSON.parse(localStorage.getItem("userData"))
        logout(userData.userId)
    } else {
        navigateTo("/")
    }
}

const logout = async (userId) => {
    try {
        const url = `/post-logout?userId=${userId}`
        const response = await fetch(url)
        if(response.ok) {
            console.log("Logged out successfully")
            localStorage.removeItem("userData")
            document.getElementById("messages").style.visibility = "hidden"
            document.getElementById("app").style.width = "100%"
            sendEvent("update_chatbar_data", "yes")
            navigateTo("/")
        } else {
            console.log(response.statusText)
        }
    } catch (error) {
        console.error("Error:", error)
        return false
    }
}
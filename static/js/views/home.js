import { getCookie } from "./login.js"

export default async function() {
    document.querySelector("#app").innerHTML = `
        <h1>This is the homepage view</h1>
    `

    if(localStorage.length != 0) {
        const userData = JSON.parse(localStorage.getItem("userData"))
        getCookie(userData.userId)
    } else {
        console.log("no user in localstorage")
    }
}
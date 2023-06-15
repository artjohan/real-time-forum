import { Event, hasSession } from "./helpers.js"
import { addChatbarHtml, addChatboxListener } from "./home.js"

var amount = 100

export default async function() {
    const isAuthorized = await hasSession()
    if(!isAuthorized) {
        navigateTo("/login")
        return
    } else {
        const userData = JSON.parse(localStorage.getItem("userData"))
        const url = new URL(window.location.href)
        const receiverId = url.searchParams.get("id")

        waitForSocketConnection(window.socket, () =>{
            getMessages(parseInt(userData.userId), parseInt(receiverId), amount)
        })

        document.querySelector("#app").innerHTML = `
            <div class="header"><br>
                <div class="nameAndChatBtncontainer">
                    <div>
                        <a>Welcome to the Forum, </a>
                        <a href="/user?id=${userData.userId}" data-link>${userData.nickname}</a>
                    </div>
                    <button id="chatBtn"></button>
                </div><br><br>
                <a href="/logout" data-link>Log out</a>
                <div style="text-align: center;">
                    <a style="font-size: 65px;  text-decoration: none;" href="/" data-link>🏠</a>
                </div>
            </div>
            <div style="text-align: center;">
                <h1 style="font-size: 50px;" id="header"></h1>
                <div class="chatBox" id="chatBox"></div><br>
                <form id="sendMsg">
                    <textarea style="width: 100%; background-color: #c2e6fb; border: #7a7fc0 solid 2px; border-radius: 5px; height: 60px; font-size: 20px; resize: none;" id="msgContent" placeholder="Message" type="text" required></textarea><br><br>
                    <button class="button-33" type="submit">Send</button>
                </form>
            </div>
        `

        addChatboxListener()
        addChatbarHtml(userData)

        const msgBody = {}

        const sendMsgForm = document.getElementById("sendMsg")
        sendMsgForm.addEventListener("submit", async (event) => {
            event.preventDefault()

            msgBody["senderId"] = userData.userId
            msgBody["receiverId"] = parseInt(receiverId)
            msgBody["message"] = document.getElementById("msgContent").value

            sendEvent("send_message", msgBody)
            sendMsgForm.reset()
        })

    }
}


const getMessages = (currentChatterId, otherChatterId, amount) => {
    const payload = {
        currentChatterId, 
        otherChatterId,
        amount
    }
    sendEvent("get_messages", payload)
}

function waitForSocketConnection(socket, callback){
    setTimeout(
        function () {
            if (socket.readyState === 1) {
                console.log("Connection is made")
                if (callback != null){
                    callback();
                }
            } else {
                console.log("wait for connection...")
                waitForSocketConnection(socket, callback);
            }

        }, 5)
}

const updateMessages = (messages) => {
    const chatBox = document.getElementById("chatBox")
    const url = new URL(window.location.href)
    const receiverId = url.searchParams.get("id")
    chatBox.innerHTML = ""
    var msgType
    messages.forEach(message => {
        if(message.receiverId != receiverId) {
            msgType = "Received"
        } else {
            msgType = "Sent"
        }
        chatBox.innerHTML += `
            <div class="msgBox${msgType}">
                <a style="font-size: 25px">${message.message}</a>
            </div>
    `
    })
    chatBox.scrollTop = chatBox.scrollHeight
}

export function routeEvent(event) {
    if(event.type === undefined) {
        console.log("no type field in the event")
    }

    switch(event.type) {
        case "send_message":
            console.log("sent message")
            getMessages(event.payload.senderId, event.payload.receiverId, amount)
            break
        case "new_message":
            console.log("received message")
            const fullPath = window.location.pathname + window.location.search
            if(fullPath === `/chat?id=${event.payload.senderId}`) {
                getMessages(event.payload.senderId, event.payload.receiverId, amount)
            }
            break
        case "get_messages":
            console.log("retrieving messages")
            if(event.payload.otherChatterNickname && document.getElementById("header").innerHTML == "") {
                document.getElementById("header").innerHTML = `Chatting with ${event.payload.otherChatterNickname}`                
            }
            if(event.payload.messages) {
                updateMessages(event.payload.messages)
            }
            break
        default:
            alert("unsupported message type")
            break
    }
}

export function sendEvent(eventName, payload) {
    const event = new Event(eventName, payload)

    window.socket.send(JSON.stringify(event))
    routeEvent(event)
}


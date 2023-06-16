import { Event, hasSession, navigateTo } from "./helpers.js"
import { addChatboxListener } from "./home.js"

var amount, scrolling, scrollEnd, scrollHeightBeforeLoad

export default async function() {
    const isAuthorized = await hasSession()
    if(!isAuthorized) {
        navigateTo("/login")
        return
    } else {
        amount = 10
        scrollEnd = false
        const userData = JSON.parse(localStorage.getItem("userData"))
        const url = new URL(window.location.href)
        const receiverId = url.searchParams.get("id")
        const nickname = await getNicknameById(receiverId)

        if(receiverId == userData.userId) {
            navigateTo("/")
            return
        }

        waitForSocketConnection(window.socket, () =>{
            getMessages(parseInt(userData.userId), parseInt(receiverId), amount)
            sendEvent("get_chatbar_data", userData.userId)
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
                <h1 style="font-size: 50px;" id="header">Chatting with ${nickname}</h1>
                <div class="chatBox" id="chatBox"></div><br>
                <form id="sendMsg">
                    <textarea style="width: 100%; background-color: #c2e6fb; border: #7a7fc0 solid 2px; border-radius: 5px; height: 60px; font-size: 20px; resize: none;" id="msgContent" placeholder="Message" type="text" required></textarea><br><br>
                    <button class="button-33" type="submit">Send</button>
                </form>
            </div>
            <div id="snackbar"></div>
        `

        addChatboxListener()

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

        document.getElementById("chatBox").addEventListener("scroll", () => {
            throttle(loadAdditionalMessages(parseInt(userData.userId), parseInt(receiverId)), 50)
        })

    }
}

const loadAdditionalMessages = (userId, receiverId) => {
    if(document.getElementById("chatBox").scrollTop === 0 && !scrollEnd) {
        amount += 10
        scrollHeightBeforeLoad = document.getElementById("chatBox").scrollHeight
        getMessages(userId, receiverId, amount)
        scrolling = true
    }
}

const getNicknameById = async (userId) => {
    try {
        const response = await fetch(`get-nickname?id=${userId}`)
        if (response.ok) {
            const data = await response.json()
            return data
        } else {
            console.log(response.statusText)
        }
    } catch (error) {
        console.error(error)
    }
}

function throttle(func, wait) {
    var lastEvent = 0
    return function() {
        var currentTime = new Date()
        if(currentTime - lastEvent > wait) {
            func.apply(this, arguments)
            lastEvent = currentTime
        }
    }
}

const showNotificationSnackbar = async (msgData) => {
    var snackBar = document.getElementById("snackbar")
    var senderNickname = await getNicknameById(msgData.senderId)

    snackBar.className = "show"
    snackBar.innerHTML = `New message from ${senderNickname}! Click here to view!`

    snackBar.addEventListener("click", () => {
        navigateTo(`/chat?id=${msgData.senderId}`)
    })

    setTimeout(function(){ snackBar.className = snackBar.className.replace("show", "") }, 3000)
}

const getMessages = (currentChatterId, otherChatterId, amount) => {
    const payload = {
        currentChatterId, 
        otherChatterId,
        amount
    }
    sendEvent("get_messages", payload)
}

export function waitForSocketConnection(socket, callback){
    setTimeout(
        function () {
            if (socket && socket.readyState === 1) {
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
    if(!scrolling) {
        chatBox.scrollTop = chatBox.scrollHeight
    } else {
        chatBox.scrollTop = chatBox.scrollHeight - scrollHeightBeforeLoad
        if(amount > messages.length) {
            scrollEnd = true
        }
        scrolling = false
    }
}

export function routeEvent(event) {
    if(event.type === undefined) {
        console.log("no type field in the event")
    }

    switch(event.type) {
        case "send_message":
            console.log("sent message")
            amount++
            getMessages(event.payload.senderId, event.payload.receiverId, amount)
            sendEvent("get_chatbar_data", event.payload.senderId)
            break
        case "new_message":
            console.log("received message")
            const fullPath = window.location.pathname + window.location.search
            if(fullPath === `/chat?id=${event.payload.senderId}`) {
                amount++
                getMessages(event.payload.senderId, event.payload.receiverId, amount)
            } else {
                showNotificationSnackbar(event.payload)
            }
            sendEvent("get_chatbar_data", event.payload.receiverId)
            break
        case "get_messages":
            console.log("retrieving messages")
            if(event.payload.messages) {
                updateMessages(event.payload.messages)
            }
            break
        case "get_chatbar_data":
            console.log("getting chatbar data")
            if(event.payload instanceof Array) {
                event.payload.sort((a, b) => {
                    const dateA = new Date(a.lastMsgData.sentDate)
                    const dateB = new Date(b.lastMsgData.sentDate)

                    if (a.lastMsgData.sentDate === '') return 1
                    if (b.lastMsgData.sentDate === '') return -1
                    return dateB - dateA;
                })
                addChatbarHtml(event.payload)
            }
            break
        case "update_chatbar_data":
            console.log("updating chatbar data")
            break
        default:
            alert("unsupported message type")
            break
    }
}

const addChatbarHtml = async (users) => {
    const chatDiv = document.getElementById("messages")
    chatDiv.innerHTML = ""
    users.forEach(user => {
        var lastMsgText = ""
        if(user.lastMsgData.message) {
            if(user.userId === user.lastMsgData.senderId) {
                lastMsgText = `${user.nickname} said: ${user.lastMsgData.message}`
            } else {
                lastMsgText = `You said: ${user.lastMsgData.message}`
            }
        }

        var userStatus
        if(user.online) {
            userStatus = "Online"
        } else {
            userStatus = "Offline"
        }
        chatDiv.innerHTML += `
            <div class="userBox${userStatus}" >
                <h1>${user.nickname}</h1>
                <header>${lastMsgText}</header>
                <a href="/chat?id=${user.userId}" data-link>Send msg</a>
                <a href="/user?id=${user.userId}" data-link>Go to profile</a>
            </div>
        `
    })
}

export function sendEvent(eventName, payload) {
    const event = new Event(eventName, payload)

    window.socket.send(JSON.stringify(event))
    routeEvent(event)
}


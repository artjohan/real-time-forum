import { getDataFromServer, hasSession, showNotificationSnackbar } from "./helpers.js"
import { addChatboxListener } from "./home.js"
import { navigateTo } from "./router.js"
import { sendEvent, waitForSocketConnection } from "./ws.js"

var amount, scrolling, scrollEnd, scrollHeightBeforeLoad, receiverId, otherChatterNickname, userNickname

export default async function() {
    const isAuthorized = await hasSession()
    if(!isAuthorized) {
        navigateTo("/login")
        return
    } else {
        const url = new URL(window.location.href)
        amount = 10
        scrollEnd = false
        receiverId = url.searchParams.get("id")

        const userData = JSON.parse(localStorage.getItem("userData"))
        otherChatterNickname = await getDataFromServer(`get-nickname?id=${receiverId}`)
        userNickname = userData.nickname

        if(receiverId == userData.userId) {
            navigateTo("/")
            return
        }

        waitForSocketConnection(window.socket, () =>{
            getMessages(parseInt(userData.userId), parseInt(receiverId), amount)
            sendEvent("get_chatbar_data", userData.userId)
        })

        addChatpageHtml(otherChatterNickname, userData)

        addChatboxListener()

        addMessageSending(userData)

        document.getElementById("chatBox").addEventListener("scroll", () => {
            throttle(loadAdditionalMessages(parseInt(userData.userId), parseInt(receiverId)), 50)
        })
    }
}

const addMessageSending = (userData) => {
    const msgContent = document.getElementById("msgContent")
    const submitBtn = document.getElementById("submitBtn")

    submitBtn.disabled = true
    msgContent.addEventListener("input", () => {
        if(msgContent.value.trim()) {
            submitBtn.disabled = false
        } else {
            submitBtn.disabled = true
        }
    })

    const msgBody = {}
    const sendMsgForm = document.getElementById("sendMsg")

    sendMsgForm.addEventListener("submit", async (event) => {
        event.preventDefault()
        if(msgContent.value.trim()) {
            submitMsgForm()
        }
    })

    const textArea = document.getElementById("msgContent")
    textArea.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            if(msgContent.value.trim()) {
                submitMsgForm()
            }
        }
    })

    const submitMsgForm = () => {
        msgBody["senderId"] = userData.userId
        msgBody["receiverId"] = parseInt(receiverId)
        msgBody["message"] = msgContent.value

        sendEvent("send_message", msgBody)
        sendMsgForm.reset()
        submitBtn.disabled = true
    }
}

const loadAdditionalMessages = (userId) => {
    if(document.getElementById("chatBox").scrollTop === 0 && !scrollEnd) {
        amount += 10
        scrollHeightBeforeLoad = document.getElementById("chatBox").scrollHeight
        getMessages(userId, parseInt(receiverId), amount)
        scrolling = true
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

const getMessages = (currentChatterId, otherChatterId, amount) => {
    const payload = {
        currentChatterId, 
        otherChatterId,
        amount
    }
    sendEvent("get_messages", payload)
}

const updateMessages = (messages) => {
    const chatBox = document.getElementById("chatBox")
    chatBox.innerHTML = ""
    var msgType, prevMsg, prevMsgType

    messages.forEach(message => {
        if(message.receiverId != receiverId) {
            msgType = "Received"
        } else {
            msgType = "Sent"
        }

        if(!prevMsg || timePassed(prevMsg, message) > 900000) {
            chatBox.innerHTML += `
                <br><br><br><div>
                    <a>${message.sentDate}</a>
                </div><br><br><br>
            `
        } else if(prevMsg && timePassed(prevMsg, message) > 300000 && prevMsgType === msgType) {
            chatBox.innerHTML += `
                <br>
            `
        }

        if(!prevMsgType || prevMsgType != msgType || timePassed(prevMsg, message) > 900000) {
            chatBox.innerHTML += `
                <div id="nicknameBox" class="nicknameBox${msgType}">
                    <a>${msgType === "Received" ? otherChatterNickname : userNickname}</a>
                </div>
            `
        }


        chatBox.innerHTML += `
            <div class="messageContainer ${msgType === 'Received' ? 'received' : 'sent'}">
                <div id="msgBox" class="msgBox${msgType}" data-linked="${message.messageId}">
                    <a style="font-size: 25px; white-space: pre-wrap;">${message.message.trim()}</a>
                </div>
                <div id="timeBox" class="timeBox${msgType}" data-link="${message.messageId}">
                    <a>${message.sentDate}</a>
                </div>
            </div>
        `

        prevMsg = message
        prevMsgType = msgType
    })

    addHoverListeners()

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

const addHoverListeners = () => {
    const hoveredDivs = document.querySelectorAll('#msgBox');

    hoveredDivs.forEach(hoveredDiv => {
    hoveredDiv.addEventListener('mouseenter', (event) => {
        const linkedId = event.target.getAttribute('data-linked');
        const linkedDiv = document.querySelector(`#timeBox[data-link="${linkedId}"]`);

        // Change the style of the linked div
        linkedDiv.style.visibility = 'visible';
    });

    hoveredDiv.addEventListener('mouseleave', (event) => {
        const linkedId = event.target.getAttribute('data-linked');
        const linkedDiv = document.querySelector(`#timeBox[data-link="${linkedId}"]`);

        // Reset the style of the linked div
        linkedDiv.style.visibility = 'hidden';
        });
    });
}

const timePassed = (prevMsg, currentMsg) => {
    const prevDate = new Date(prevMsg.sentDate)
    const currentDate = new Date(currentMsg.sentDate)

    return Math.abs(currentDate.getTime() - prevDate.getTime())
}

export const handleSendMessage = (payload) => {
    console.log("sent message")
    amount++
    getMessages(payload.senderId, payload.receiverId, amount)
    sendEvent("get_chatbar_data", payload.senderId)
}

export const handleNewMessage = (payload) => {
    console.log("received message")
    const fullPath = window.location.pathname + window.location.search
    if(fullPath === `/chat?id=${payload.senderId}`) {
        amount++
        getMessages(payload.senderId, payload.receiverId, amount)
    } else {
        showNotificationSnackbar(payload)
    }
    sendEvent("get_chatbar_data", payload.receiverId)
}

export const handleGetMessages = (payload) => {
    if(payload.messages) {
        updateMessages(payload.messages)
        console.log("successfully retrieved messages")
    } else {
        console.log("retrieving messages")
    }
}

export const handleGetChatbarData = (payload) => {
    if(payload instanceof Array) {
        console.log("successfully retrieved chatbar data")
        payload.sort((a, b) => {
            const dateA = new Date(a.lastMsgData.sentDate)
            const dateB = new Date(b.lastMsgData.sentDate)

            if (a.lastMsgData.sentDate === '') return 1
            if (b.lastMsgData.sentDate === '') return -1
            return dateB - dateA;
        })
        addChatbarHtml(payload)
    } else {
        console.log("retrieving chatbar data")
    }
}

const addChatbarHtml = async (users) => {
    const chatDiv = document.getElementById("messages")
    chatDiv.innerHTML = ""
    users.forEach(user => {
        var lastMsgText = ""
        if(user.lastMsgData.message) {
            if(user.userId === user.lastMsgData.senderId) {
                lastMsgText = `${user.nickname} said: ${user.lastMsgData.message.substring(0, 20)}${user.lastMsgData.message.length > 25 ? "..." : ""}`
            } else {
                lastMsgText = `You said: ${user.lastMsgData.message.substring(0, 20)}${user.lastMsgData.message.length > 25 ? "..." : ""}`
            }
        }

        chatDiv.innerHTML += `
            <div class="userBox">
                <div class="messageContainer" style="justify-content: center;">
                    <h1 style="margin-right: 5px;">${user.nickname}</h1>
                    <div class="statusIndicator" style="background: ${user.online ? 'green' : 'grey'}; width: 30px; height: 30px;"></div>
                </div>
                <header>${lastMsgText}</header><br>
                <a class="button-33" style="width: 30%;" href="/chat?id=${user.userId}" data-link>Chat</a>
                <a class="button-33" style="width: 30%;" href="/user?id=${user.userId}" data-link>Profile</a><br><br>
            </div>
        `
    })
}

const addChatpageHtml = (nickname, userData) => {
    document.querySelector("#app").innerHTML = `
            <div class="header">
                <div style="direction: rtl">
                    <a>Welcome to the Forum, </a>
                    <a href="/user?id=${userData.userId}" data-link>${userData.nickname}</a>
                </div>
                <div class="headerBtnsContainer">
                    <button id="chatBtn" style="height: fit-content;" class="button-33"></button>
                    <a style="font-size: 65px;  text-decoration: none;" href="/" data-link>🏠</a>
                    <a class="button-33" href="/logout" data-link>Log out</a>
                </div>
            </div>
            <div style="text-align: center;">
                <h1 style="font-size: 50px;" id="header">Chatting with ${nickname}</h1>
                <div class="chatBox" id="chatBox"></div><br>
                <form id="sendMsg">
                    <div class="messageContainer">
                        <textarea id="msgContent" class="createPostHeaderAndTags" style="height: 60px; width: 95%; resize: none;" placeholder="Message" type="text" required></textarea><br><br>
                        <button id="submitBtn"class="button-33" style="margin-left: 10px;" type="submit">Send</button>
                    </div>
                </form>
            </div>
            <div id="snackbar"></div>
        `
}


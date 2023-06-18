import { sendEvent, waitForSocketConnection } from "./ws.js"
import { hasSession, handleDefaultResponse, getDataFromServer } from "./helpers.js"
import { router, navigateTo, navigateToWithoutSavingHistory } from "./router.js"

export default async function() {
    const isAuthorized = await hasSession()
    if(!isAuthorized) {
        navigateTo("/login")
        return
    } else {
        const url = new URL(window.location.href)

        const userData = JSON.parse(localStorage.getItem("userData"))
        const category = url.searchParams.get("category")

        const allPosts = await getDataFromServer(`get-posts?userId=${userData.userId}`)
        const allCategories = await getDataFromServer('/get-all-categories')

        waitForSocketConnection(window.socket, () =>{
            sendEvent("get_chatbar_data", userData.userId)
        })

        addHomePageHtml(userData)

        addChatboxListener()
        
        if(allPosts) {
            allPosts.forEach(post => {
                addPostHtml(post, "posts")
            })
        }

        if(allCategories) {
            allCategories.forEach(category => {
                addCategory(category)
            })
        }

        addPostCreation(userData)

        const categorySelect = document.getElementById("categorySelect")
        categorySelect.addEventListener("change", (event) => {
            if(event.target.value) {
                navigateToWithoutSavingHistory(`/?category=${event.target.value.toLowerCase()}`)
            } else {
                navigateTo("/")
            }
        })

        if(category) {
            categorySelect.value = category.toUpperCase()
            const filteredPosts = await getDataFromServer(`/get-filtered-posts?category=${category.toUpperCase()}`)

            document.querySelector("#posts").innerHTML = ""
            filteredPosts.forEach(post => {
                addPostHtml(post, "posts")
            })
        }
    }
}

const addCategory = (category) => {
    const option = document.createElement('option')
  
    option.value = category
    option.textContent = category

    document.getElementById("categorySelect").appendChild(option)
}

const addPostCreation = (userData) => {
    const createPostData = {}
    const createPostForm = document.getElementById("createPost")

    createPostForm.addEventListener("submit", async (event) => {
        event.preventDefault()

        var formData = new FormData(createPostForm)
        createPostData["creatorId"] = userData.userId

        for (var [key, value] of formData.entries()) {
            createPostData[key] = value
        }

        const options = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(createPostData)
        }
        try {
            const response = await fetch("/create-post", options)
            handleDefaultResponse(response)
        } catch (error) {
            console.error(error)
        }
    })
}

export const addChatboxListener = () => {
    const chatDiv = document.getElementById("messages")
    const appDiv = document.getElementById("app")
    const chatBtn = document.getElementById("chatBtn")

    if(chatDiv.dataset.value === "minimized") {
        chatBtn.innerHTML = "Show chat"
    } else {
        chatBtn.innerHTML = "Minimize chat"
    }

    chatBtn.addEventListener("click", () => {
        if(chatDiv.dataset.value === "minimized") {
            chatBtn.innerHTML = "Minimize chat"
            chatDiv.dataset.value = "maximized"
            appDiv.style.width = "75%"
            chatDiv.style.visibility = "visible"
        } else {
            chatBtn.innerHTML = "Show chat"
            chatDiv.dataset.value = "minimized"
            appDiv.style.width = "100%"
            chatDiv.style.visibility = "hidden"
        }
    })
}


export const addPostHtml = (post, contentDivId) => {
    document.querySelector(`#${contentDivId}`).innerHTML += `
        <div class="threadbox">
            <div class="title">
                <a style="white-space: pre-wrap; font-size: 30px; font-weight: bold;" href="/posts?id=${post.postId}" data-link>${post.postHeader}</a>
            </div>
            <div id="categoriesOfPost${post.postId}" class="threadcats"></div>
            <div class="threadinfo">
                <a>Started by </a>
                <a href="/user?id=${post.creatorId}" data-link>${post.creatorNickname}</a>
                <a>on</a>
                <a>${post.creationDate}</a><br>
            </div>
            <div style="text-align: center; flex-basis: 10%;">
                <a>Comments: ${post.comments}</a>
            </div>
        </div>
        `
        if(post.categories) {
            const categoryDiv = document.querySelector(`#categoriesOfPost${post.postId}`)
            categoryDiv.innerHTML += `<a>Categories: </a>`
            post.categories.forEach(category => {
                categoryDiv.innerHTML += `<a>${category} </a>`
            })
        }
}

const addHomePageHtml = (userData) => {
    document.querySelector("#app").innerHTML = `
            <div class="header">
                <div>
                    <a>Welcome to the Forum, </a>
                    <a href="/user?id=${userData.userId}" data-link>${userData.nickname}</a>
                </div>
                <div class="headerBtnsContainer">
                    <a class="button-33" href="/logout" data-link>Log out</a> 
                    <a style="font-size: 65px;  text-decoration: none;" href="/" data-link>🏠</a>
                    <button id="chatBtn" style="height: fit-content;" class="button-33"></button>
                </div>
            </div>
            <div style="text-align: center;">
                <br><br>
                <h1 style="font-size: 50px;">Posts</h1>
                <form id="createPost">
                    <div style="display: flex;">
                        <input class="createPostHeaderAndTags" name="postHeader" type="text" placeholder="Post header" required>
                        <input class="createPostHeaderAndTags" name="categories" type="text" placeholder="Optional categories, separate each one with #"><br>
                    </div><br>
                    <textarea class="createPostContent" name="postContent" placeholder="Post content" required></textarea><br><br>
                    <button class="button-33" type="submit">Submit post</button>
                </form>
                <br><br><br>
                <select id="categorySelect" name="categorySelect" class="catSelect">
                    <option value="" selected>All categories</option>
                </select><br><br>
                <div id="posts"></div>
            </div>
            <div id="snackbar">Some text some message..</div>
        `
}

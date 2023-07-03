import { sendEvent, waitForSocketConnection } from "./ws.js"
import { hasSession, handleDefaultResponse, getDataFromServer } from "./helpers.js"
import { navigateTo, navigateToWithoutSavingHistory } from "./router.js"

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
    const postContent = document.getElementById("postContent")
    const postHeader = document.getElementById("postHeader")
    const submitBtn = document.getElementById("submitBtn")

    submitBtn.disabled = true
    postHeader.addEventListener("input", () => {
        changeBtnStatus()
    })

    postContent.addEventListener("input", () => {
        changeBtnStatus()
    })

    const changeBtnStatus = () => {
        if(postHeader.value.trim() && postContent.value.trim()) {
            submitBtn.disabled = false
        } else {
            submitBtn.disabled = true
        }
    }

    const createPostData = {}
    const createPostForm = document.getElementById("createPost")

    createPostForm.addEventListener("submit", async (event) => {
        event.preventDefault()
        if(postHeader.value.trim() && postContent.value.trim()) {
            var formData = new FormData(createPostForm)
            createPostData["creatorId"] = userData.userId

            for (var [key, value] of formData.entries()) {
                if(key === "postHeader") {
                    value = value.trim()
                }
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
            appDiv.style.right = "0"
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
                <a class="titleText" href="/posts?id=${post.postId}" data-link>${post.postHeader}</a>
            </div>
            <div id="categoriesOfPost${post.postId}" class="threadcats"></div>
            <div class="threadinfo">
                <a>Created by </a>
                <a href="/user?id=${post.creatorId}" data-link>${post.creatorNickname}</a><br>
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
                <div style="direction: rtl;">
                    <a>Welcome to the Forum, </a>
                    <a href="/user?id=${userData.userId}" data-link>${userData.nickname}</a>
                </div>
                <div class="headerBtnsContainer">
                    <button id="chatBtn" style="height: fit-content; width: 145px;" class="button-33"></button>
                    <a style="font-size: 65px;  text-decoration: none;" href="/" data-link>🏠</a>
                    <a class="button-33" style="width: 105px;" href="/logout" data-link>Log out</a>
                </div>
            </div>
            <div style="text-align: center;">
                <br><br>
                <h1 style="font-size: 50px;">Posts</h1>
                <form id="createPost">
                    <div style="display: flex;">
                        <input class="createPostHeaderAndTags" name="postHeader" id="postHeader" type="text" placeholder="Post header">
                        <input class="createPostHeaderAndTags" name="categories" type="text" placeholder="Optional categories, separate each one with #"><br>
                    </div><br>
                    <textarea class="createPostContent" name="postContent" id="postContent" placeholder="Post content"></textarea><br><br>
                    <button id="submitBtn" class="button-33" type="submit">Submit post</button>
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

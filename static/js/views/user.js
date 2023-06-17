import { sendEvent, waitForSocketConnection } from "./ws.js"
import { hasSession } from "./helpers.js"
import { addChatboxListener, addPostHtml } from "./home.js"
import { addCommentHtml, handleCommentReactions, postReaction } from "./posts.js"
import { navigateTo, navigateToWithoutSavingHistory } from "./router.js"


export default async function() {
    const isAuthorized = await hasSession()
    if(!isAuthorized) {
        navigateTo("/login")
        return
    } else {
        const url = new URL(window.location.href)

        const viewedUserId = url.searchParams.get("id")
        const viewType = url.searchParams.get("view")

        const userData = JSON.parse(localStorage.getItem("userData"))
        const viewedUserData = await getDataFromServer(`/get-user-info?userId=${viewedUserId}`)

        addUserPageHtml(userData, viewedUserData, viewedUserId)
        
        document.querySelectorAll(".option").forEach(option => {
            option.addEventListener("click", (e) => {
                navigateToWithoutSavingHistory(`/user?id=${viewedUserId}&view=${e.target.id}`)
            })
        })

        waitForSocketConnection(window.socket, () =>{
            sendEvent("get_chatbar_data", userData.userId)
        })

        addChatboxListener()

        if(viewType) {
            addViewTypeHtml(viewType, userData, viewedUserId)
        }
    }
}

const addViewTypeHtml = (viewType, userData, viewedUserId) => {
    document.getElementById(viewType).classList.add("selected")

    const viewTypeFunctions = {
        createdPosts: addCreatedPostsHtml,
        createdComments: addCreatedCommentsHtml,
        likedPosts: addLikedPostsHtml,
        likedComments: addLikedCommentsHtml,
        dislikedPosts: addDislikedPostsHtml,
        dislikedComments: addDislikedCommentsHtml,
    }

    viewTypeFunctions[viewType](document.getElementById("selectContent"), viewedUserId, userData.userId)
    
    handleCommentReactions(userData)
    handlePostReactions(userData)
}

const addCreatedPostsHtml = async (contentDiv, viewedUserId, currentUserId) => {
    const createdPosts = await getDataFromServer(`/get-created-posts?viewedUserId=${viewedUserId}&currentUserId=${currentUserId}`)
    contentDiv.innerHTML = ""
    if(createdPosts) {
        createdPosts.forEach(post => {
            addPostHtml(post, "selectContent")
        })
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addCreatedCommentsHtml = async (contentDiv, viewedUserId, currentUserId) => {
    const createdComments = await getDataFromServer(`/get-created-comments?viewedUserId=${viewedUserId}&currentUserId=${currentUserId}`)
    contentDiv.innerHTML = ""
    if(createdComments) {
        createdComments.forEach(comment => {
            addParentPostHtml(comment.parentPostInfo, "selectContent", "User commented:")
            comment.commentsInfo.forEach(commentInfo => {
                addCommentHtml(commentInfo, `comments${comment.parentPostInfo.postId}`)
            })
        })
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addLikedPostsHtml = async (contentDiv, viewedUserId, currentUserId) => {
    const likedPosts = await getDataFromServer(`/get-liked-posts?viewedUserId=${viewedUserId}&currentUserId=${currentUserId}`)
    contentDiv.innerHTML = ""
    if(likedPosts) {
        likedPosts.forEach(post => {
            addPostHtml(post, "selectContent")
        })
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addLikedCommentsHtml = async (contentDiv, viewedUserId, currentUserId) => {
    const likedComments = await getDataFromServer(`/get-liked-comments?viewedUserId=${viewedUserId}&currentUserId=${currentUserId}`)
    contentDiv.innerHTML = ""
    if(likedComments) {
        likedComments.forEach(comment => {
            addParentPostHtml(comment.parentPostInfo, "selectContent", "User liked:")
            comment.commentsInfo.forEach(commentInfo => {
                addCommentHtml(commentInfo, `comments${comment.parentPostInfo.postId}`)
            })
        })
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addDislikedPostsHtml = async (contentDiv, viewedUserId, currentUserId) => {
    const dislikedPosts = await getDataFromServer(`/get-disliked-posts?viewedUserId=${viewedUserId}&currentUserId=${currentUserId}`)
    contentDiv.innerHTML = ""
    if(dislikedPosts) {
        dislikedPosts.forEach(post => {
            addPostHtml(post, "selectContent")
        })
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addDislikedCommentsHtml = async (contentDiv, viewedUserId, currentUserId) => {
    const dislikedComments = await getDataFromServer(`/get-disliked-comments?viewedUserId=${viewedUserId}&currentUserId=${currentUserId}`)
    contentDiv.innerHTML = ""
    if(dislikedComments) {
        dislikedComments.forEach(comment => {
            addParentPostHtml(comment.parentPostInfo, "selectContent", "User disliked:")
            comment.commentsInfo.forEach(commentInfo => {
                addCommentHtml(commentInfo, `comments${comment.parentPostInfo.postId}`)
            })
        })
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const getDataFromServer = async (url) => {
    try {
        const response = await fetch(url)
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

const addParentPostHtml = (parentPostInfo, contentDivId, descMsg) => {
    document.querySelector(`#${contentDivId}`).innerHTML += `
        <div style="text-align: center; overflow-wrap: break-word;">
            <br><br>
            <a style="font-size: 50px;">Under post: </a>
            <a href="/posts?id=${parentPostInfo.postId}" data-link style="font-size: 50px;">${parentPostInfo.postHeader}</a>
            <br><br><br>
            <div class="postbox">
                <div class="postinfobox">
                    <a href="/user?id=${parentPostInfo.creatorId}" data-link>${parentPostInfo.creatorNickname}</a><br><br>
                    <a>${parentPostInfo.creationDate}</a><br>
                </div>
                <div class="postcontent">
                    <a>${parentPostInfo.postContent}</a>
                </div>
                <div class="reactionbox">
                    <button class="` + (parentPostInfo.likedByCurrentUser ? "reactionbtnLiked" : "reactionbtn") + `" id="postLike" value="${parentPostInfo.postId}">👍</button>
                    <a style="color: green; text-shadow: 1px 1px 0 #000; font-size: 30px;">${parentPostInfo.likes}</a>
                    <button class="` + (parentPostInfo.dislikedByCurrentUser ? "reactionbtnDisliked" : "reactionbtn") + `" id="postDislike" value="${parentPostInfo.postId}">👎</button>
                    <a style="color: red; text-shadow: 1px 1px 0 #000; font-size: 30px;">${parentPostInfo.dislikes}</a>
                </div>
            </div><br><br><br>
            <h1 style="font-size: 50px;">${descMsg}</h1>
            <div id="comments${parentPostInfo.postId}"></div>
        </div>
    `
}

const handlePostReactions = (userData) => {
    const postLikeBtns = document.querySelectorAll("#postLike")
    postLikeBtns.forEach(postLikeBtn => {
        postLikeBtn.addEventListener("click", () => {
            postReaction(parseInt(postLikeBtn.value), userData, "like", "post")
        })
    })

    const postDislikeBtns = document.querySelectorAll("#postDislike")
    postDislikeBtns.forEach(postDislikeBtn => {
        postDislikeBtn.addEventListener("click", () => {
            postReaction(parseInt(postDislikeBtn.value), userData, "dislike", "post")
        })
    })
}

const addUserPageHtml = (userData, viewedUserData, viewedUserId) => {
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
            <h1 style="font-size: 50px;">${viewedUserData.nickname}${viewedUserData.online ? "🟢" : ""}</h1>
            <p>Age: ${viewedUserData.age}</p>
            <p>Gender: ${viewedUserData.gender}</p>
            <p>First name: ${viewedUserData.firstName}</p>
            <p>Last name: ${viewedUserData.lastName}</p>
            <p>Email: ${viewedUserData.email}</p>
        </div>
        <div id="msgUser" style="text-align: center;"></div>
        <ul class="toolbar">
            <li class="option" id="createdPosts">Created Posts</li>
            <li class="option" id="createdComments">Created Comments</li>
            <li class="option" id="likedPosts">Liked Posts</li>
            <li class="option" id="likedComments">Liked Comments</li>
            <li class="option" id="dislikedPosts">Disliked Posts</li>
            <li class="option" id="dislikedComments">Disliked Comments</li>
        </ul>
        <div id="selectContent"></div>
    `
    
    if(viewedUserId != userData.userId) {
        document.getElementById("msgUser").innerHTML = `
            <button id="msgBtn" class="button-33">Message this user</button
        `
        document.getElementById("msgBtn").addEventListener("click", () => {
            navigateTo(`/chat?id=${viewedUserId}`)
        })
    }
}
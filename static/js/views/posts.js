import { hasSession, navigateTo, handleResponse } from "./helpers.js"
import { addChatbarHtml, addChatboxListener } from "./home.js"

export default async function() {
    const isAuthorized = await hasSession()
    if(!isAuthorized) {
        navigateTo("/login")
        return
    } else {
        const url = new URL(window.location.href)
        const postId = url.searchParams.get("id")

        const userData = JSON.parse(localStorage.getItem("userData"))
        const allInfo = await getPostAndComments(userData.userId, postId)

        addToolbarAndPostHtml(userData, allInfo)
        if(allInfo.commentsInfo) {
            allInfo.commentsInfo.forEach(comment => {
                addCommentHtml(comment, "comments")
            })
        }

        createCommentListener(userData, postId)

        handlePostReactions(parseInt(postId), userData)
        handleCommentReactions(userData)

        addChatboxListener()
        addChatbarHtml(userData)
    }
}

const getPostAndComments = async (userId, postId) => {
    try {
        const response = await fetch(`/get-post-details?postId=${postId}&userId=${userId}`)
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

const handlePostReactions = (postId, userData) => {
    document.getElementById("postLike").addEventListener("click", () => {
        postReaction(postId, userData, "like", "post")
    })  

    document.getElementById("postDislike").addEventListener("click", () => {
        postReaction(postId, userData, "dislike", "post")
    })
}

export const handleCommentReactions = (userData) => {
    const commentLikeBtns = document.querySelectorAll("#commentLike")
    commentLikeBtns.forEach(commentLikeBtn => {
        commentLikeBtn.addEventListener("click", () => {
            postReaction(parseInt(commentLikeBtn.value), userData, "like", "comment")
        })
    })

    const commentDislikeBtns = document.querySelectorAll("#commentDislike")
    commentDislikeBtns.forEach(commentDislikeBtn => {
        commentDislikeBtn.addEventListener("click", () => {
            postReaction(parseInt(commentDislikeBtn.value), userData, "dislike", "comment")
        })
    })
}

export const postReaction = async (postId, userData, reactionType, postType) => {
    const addReactionData = {
        reactionType,
        postType,
        "postOrCommentId": postId,
        "userId": userData.userId
    }
    const options = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(addReactionData)
    }
    try {
        const response = await fetch("/post-reaction", options)
        handleResponse(response)
    } catch (error) {
        console.error(error)
    }
}

const createCommentListener = (userData, postId) => {
    const createCommentData = {}
    document.getElementById("createComment").addEventListener("submit", async (event) => {
        event.preventDefault()
        createCommentData["creatorId"] = userData.userId
        createCommentData["postId"] = parseInt(postId)
        createCommentData["commentContent"] = document.getElementById("commentContent").value
        const options = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(createCommentData)
        }
        try {
            const response = await fetch("/create-comment", options)
            handleResponse(response)
        } catch (error) {
            console.error(error)
        }
    })
}

const addToolbarAndPostHtml = (userData, allInfo) => {
    document.querySelector("#app").innerHTML = `
        <div class="header">
            <div class="nameAndChatBtncontainer">
                <div>
                    <a>Welcome to the Forum, </a>
                    <a href="/user?id=${userData.userId}" data-link>${userData.nickname}</a>
                </div>
                <button id="chatBtn">Show chat</button>
            </div><br><br>
            <a href="/logout" data-link>Log out</a>
            <div style="text-align: center;">
                <a style="font-size: 65px;  text-decoration: none;" href="/" data-link>🏠</a>
            </div>
        </div>
        <div style="text-align: center;">
            <br><br>
            <h1 style="font-size: 50px;">${allInfo.parentPostInfo.postHeader}</h1>
            <br><br><br>
            <div class="postbox">
                <div class="postinfobox">
                    <a href="/user?id=${allInfo.parentPostInfo.creatorId}" data-link>${allInfo.parentPostInfo.creatorNickname}</a><br><br>
                    <a>${allInfo.parentPostInfo.creationDate}</a><br>
                </div>
                <div class="postcontent">
                    <a>${allInfo.parentPostInfo.postContent}</a>
                </div>
                <div class="reactionbox">
                    <button class="` + (allInfo.parentPostInfo.likedByCurrentUser ? "reactionbtnLiked" : "reactionbtn") + `" id="postLike">👍</button>
                    <a style="color: green; text-shadow: 1px 1px 0 #000; font-size: 30px;">${allInfo.parentPostInfo.likes}</a>
                    <button class="` + (allInfo.parentPostInfo.dislikedByCurrentUser ? "reactionbtnDisliked" : "reactionbtn") + `" id="postDislike">👎</button>
                    <a style="color: red; text-shadow: 1px 1px 0 #000; font-size: 30px;">${allInfo.parentPostInfo.dislikes}</a>
                </div>
            </div><br><br><br>
            <h1 style="font-size: 50px;">Comments:</h1>
            <div id="comments"></div>
            <form id="createComment">
                <textarea style="width: 100%; background-color: #c2e6fb; border: #7a7fc0 solid 2px; border-radius: 5px; height: 100px; font-size: 20px;" id="commentContent" placeholder="Add comment" type="text" required></textarea><br><br>
                <button class="button-33" type="submit">Submit comment</button>
            </form>
        </div>
    `
}

export const addCommentHtml = (comment, contentDivId) => {
    document.querySelector(`#${contentDivId}`).innerHTML += `
    <div class="postbox">
        <div class="postinfobox">
            <a href="/user?id=${comment.creatorId}" data-link>${comment.creatorNickname}</a><br><br>
            <a>${comment.creationDate}</a><br>
        </div>
        <div class="postcontent">
            <a>${comment.commentContent}</a>
        </div>
        <div class="reactionbox">
            <button class="` + (comment.likedByCurrentUser ? "reactionbtnLiked" : "reactionbtn") + `" id="commentLike" value="${comment.commentId}">👍</button>
            <a style="color: green; text-shadow: 1px 1px 0 #000; font-size: 30px;">${comment.likes}</a>
            <button class="` + (comment.dislikedByCurrentUser ? "reactionbtnDisliked" : "reactionbtn") + `"class="reactionbtn" id="commentDislike" value="${comment.commentId}">👎</button>
            <a style="color: red; text-shadow: 1px 1px 0 #000; font-size: 30px;">${comment.dislikes}</a>
        </div>
    </div>
`
}
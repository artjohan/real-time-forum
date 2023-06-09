import { hasSession, navigateTo, router } from "./helpers.js"
import { addPostHtml } from "./home.js"
import { addCommentHtml, handleCommentReactions, postReaction } from "./posts.js"


export default async function() {
    const isAuthorized = await hasSession()
    if(!isAuthorized) {
        navigateTo("/login")
        return
    } else {
        const url = new URL(window.location.href)
        const userId = url.searchParams.get("id")
        const viewType = url.searchParams.get("view")
        const userData = JSON.parse(localStorage.getItem("userData"))

        const allData = await getUserData(userId, userData.userId)
        console.log(allData)
        document.querySelector("#app").innerHTML = `
        <div class="header">
            <br><a>Welcome to the Forum, </a>
            <a href="/user?id=${userData.userId}" data-link>${userData.nickname}</a><br><br>
            <a href="/logout" data-link>Log out</a>
            <div style="text-align: center;">
                <a style="font-size: 65px;  text-decoration: none;" href="/" data-link>🏠</a>
            </div>
        </div>
        <div style="text-align: center;">
            <h1 style="font-size: 50px;">User information</h1>
            <p>Nickname: ${allData.userInfo.nickname}</p>
            <p>Age: ${allData.userInfo.age}</p>
            <p>Gender: ${allData.userInfo.gender}</p>
            <p>First name: ${allData.userInfo.firstName}</p>
            <p>Last name: ${allData.userInfo.lastName}</p>
            <p>Email: ${allData.userInfo.email}</p>
        </div>
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
        const contentDiv = document.getElementById("selectContent")
        document.querySelectorAll(".option").forEach(option => {
            option.addEventListener("click", (e) => {
                navigateTo(`/user?id=${userId}&view=${e.target.id}`)
            })
        })

        if(viewType) {
            document.getElementById(viewType).classList.add("selected")
            switch (viewType) {
                case "createdPosts":
                    addCreatedPostsHtml(contentDiv, allData)
                    break;
                case "createdComments":
                    addCreatedCommentsHtml(contentDiv, allData)
                    break;
                case "likedPosts":
                    addLikedPostsHtml(contentDiv, allData)
                    break;
                case "likedComments":
                    addLikedCommentsHtml(contentDiv, allData)
                    break;
                case "dislikedPosts":
                    addDislikedPostsHtml(contentDiv, allData)
                    break;
                case "dislikedComments":
                    addDislikedCommentsHtml(contentDiv, allData)
                    break;
            }
            handleCommentReactions(userData)
            handlePostReactions(userData)
        }
    }
}

const addCreatedPostsHtml = (contentDiv, allData) => {
    contentDiv.innerHTML = ""
    if(allData.createdPosts) {
        allData.createdPosts.forEach(post => {
            addPostHtml(post, "selectContent")
        })
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addCreatedCommentsHtml = (contentDiv, allData) => {
    contentDiv.innerHTML = ""
    if(allData.createdComments) {
        allData.createdComments.forEach(comment => {
            addParentPostHtml(comment.parentPostInfo, "selectContent", "User commented:")
            comment.commentsInfo.forEach(commentInfo => {
                addCommentHtml(commentInfo, `comments${comment.parentPostInfo.postId}`)
            })
        })
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addLikedPostsHtml = (contentDiv, allData) => {
    contentDiv.innerHTML = ""
    if(allData.likedPosts) {
        allData.likedPosts.forEach(post => {
            addPostHtml(post, "selectContent")
        })
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addLikedCommentsHtml = (contentDiv, allData) => {
    contentDiv.innerHTML = ""
    if(allData.likedComments) {
        allData.likedComments.forEach(comment => {
            addParentPostHtml(comment.parentPostInfo, "selectContent", "User liked:")
            comment.commentsInfo.forEach(commentInfo => {
                addCommentHtml(commentInfo, `comments${comment.parentPostInfo.postId}`)
            })
        })
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addDislikedPostsHtml = (contentDiv, allData) => {
    contentDiv.innerHTML = ""
    if(allData.dislikedPosts) {
        allData.dislikedPosts.forEach(post => {
            addPostHtml(post, "selectContent")
        })
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const addDislikedCommentsHtml = (contentDiv, allData) => {
    contentDiv.innerHTML = ""
    if(allData.dislikedComments) {
        allData.dislikedComments.forEach(comment => {
            addParentPostHtml(comment.parentPostInfo, "selectContent", "User disliked:")
            comment.commentsInfo.forEach(commentInfo => {
                addCommentHtml(commentInfo, `comments${comment.parentPostInfo.postId}`)
            })
        })
    } else {
        contentDiv.innerHTML = "<h1>Nothing to show here</h1>"
    }
}

const getUserData = async (userId, currentUserId) => {
    try {
        const response = await fetch(`/get-user-data?userId=${userId}&currentUser=${currentUserId}`)
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
        <div style="text-align: center;">
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
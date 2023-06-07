import { hasSession, navigateTo } from "./helpers.js"

export default async function() {
    const isAuthorized = await hasSession()
    if(!isAuthorized) {
        navigateTo("/login")
        return
    } else {
        const userData = JSON.parse(localStorage.getItem("userData"))
        const allPosts = await getPosts()
        document.querySelector("#app").innerHTML = `
        <body>
            <div class="header">
                <br><a>Welcome to the Forum, </a>
                <a href="/user?id=${userData.userId}" data-link>${userData.nickname}</a><br><br>
                <a href="/logout" data-link>Log out</a>
                <div style="text-align: center;">
                    <a style="font-size: 65px;  text-decoration: none;" href="/" data-link>🏠</a>
                </div>
            </div>
            <div style="text-align: center;">
            <br><br>
            <h1 style="font-size: 50px;">Posts</h1>
            <form id="createPost">
                <div style="display: flex;">
                    <input style="width: 50%; background-color: #c2e6fb; border: #7a7fc0 solid 2px; border-radius: 5px; font-size: 20px;" name="postHeader" type="text" placeholder="Post header" required maxlength=40>
                    <input style="width: 50%; background-color: #c2e6fb; border: #7a7fc0 solid 2px; border-radius: 5px; font-size: 20px;" name="categories" type="text" placeholder="Optional categories, separate each one with #"><br>
                </div><br>
                <textarea style="width: 100%; background-color: #c2e6fb; border: #7a7fc0 solid 2px; border-radius: 5px; height: 100px; font-size: 20px;" name="postContent" placeholder="Post content" required></textarea><br><br>
                <button class="button-33" type="submit">Submit post</button>
            </form>
            <div id="posts"></div>
        </div>
        </body>
        `
        
        allPosts.forEach(post => {
            document.querySelector("#posts").innerHTML += `
            <div class="threadbox">
                <div class="title">
                    <a style="white-space: pre; font-size: 30px; font-weight: bold;" href="/posts?id=${post.postId}" data-link>${post.postHeader}</a>
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
                    categoryDiv.innerHTML += `<a href="/category?cat=${category}" data-link>#${category} </a>`
                })
            }
        })

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
                handleResponse(response)
            } catch (error) {
                console.error(error)
            }
        })
    }
}

const handleResponse = async (response) => {
    if(response.ok) {
        window.location.reload()
    } else {
        const statusMsg = await response.text()
        console.log(statusMsg)
    }
}

const getPosts = async () => {
    try {
        const response = await fetch('/get-posts')
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
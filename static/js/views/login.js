export default async function() {
    document.querySelector("#app").innerHTML = `
    <div style="text-align: center;">
        <div class="header">
            <header style="font-size: 65px;">Welcome back!</header>
        </div><br>
    <form id="loginForm" method="POST">
        <input class="inputbox" name="nicknameOrEmail" placeholder="Nickname or Email" maxlength="60" minlength="3" required></input><br><br>
        <input class="inputbox" name="password" placeholder="Password" type="password" id="password" maxlength="20" minlength="6" required></input><br><br>
        <button class="button-33" type="submit">Log in</button><br><br>
    </form>
    <a>Don't have an account? Register</a>
    <a href="/register"> here</a>
    </div>
    `

    const loginData = {}
    const loginForm = document.getElementById("loginForm")

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault()
        var formData = new FormData(loginForm)

        for (var [key, value] of formData.entries()) {
            loginData[key] = value
        }

        const options = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData)
        }
        try {
            const response = await fetch("/post-login", options)
            handleResponse(response)
        } catch (error) {
            console.error(error)
        }
    })
}

const handleResponse = async (response) => {
    if(response.ok) {
        const data = await response.json()
        localStorage.setItem("userData", JSON.stringify(data))
        window.location.href = "/"
    } else {
        const statusMsg = await response.text()
        console.log(statusMsg)
    }
}

export const getCookie = (userId) => {
    const url = `/get-cookie?userId=${userId}`
    fetch(url)
      .then(response => {
        if (response.ok) {
            console.log("Session exists")
        } else {
            console.log("Session does not exist")
        }
      })
      .catch(error => {
        console.error("Error:", error)
      });
  }
  